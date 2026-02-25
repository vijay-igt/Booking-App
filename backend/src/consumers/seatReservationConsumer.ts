import { getConsumer, getProducer } from '../config/kafkaClient';
import { Booking } from '../models/Booking';
import { Seat } from '../models/Seat';
import { Ticket } from '../models/Ticket';
import { Showtime } from '../models/Showtime';
import { Movie } from '../models/Movie';
import { sequelize } from '../config/database';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { LockService } from '../services/lockService';
import { Wallet } from '../models/Wallet';
import { Screen } from '../models/Screen';
import { Theater } from '../models/Theater';
import { Coupon } from '../models/Coupon';
import { CouponUsage } from '../models/CouponUsage';
import { BookingFoodItem } from '../models/BookingFoodItem';
import { FoodItem } from '../models/FoodItem';
import { sendNotificationToUser } from '../services/websocketService';

export const startSeatReservationConsumer = async () => {
    try {
        const consumer = await getConsumer('reservation-group');
        if (!consumer) {
            console.warn('[ReservationConsumer] Kafka consumer could not be started.');
            return;
        }

        await consumer.subscribe({ topics: ['seat-reservations'], fromBeginning: true });

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                if (!message.value) return;
                const { userId, showtimeId, seatIds, totalAmount, trackingId, paymentMethod, couponCode, foodItems } = JSON.parse(message.value.toString());

                // Validate Seat Locks
                const hasLock = await LockService.validateLock(showtimeId, seatIds, userId);
                if (!hasLock) {
                    console.warn(`[ReservationConsumer] Lock for showtime ${showtimeId}, seats ${seatIds} by user ${userId} is invalid or expired. Booking ${trackingId} aborted.`);
                    return; // Abort processing if lock is invalid
                }

                const transaction = await sequelize.transaction();
                try {
                    // Fetch Showtime & Related Info first
                    const showtime = await Showtime.findByPk(showtimeId, {
                        include: [{
                            model: Screen,
                            include: [{
                                model: Theater,
                                include: [{ model: User, as: 'owner' }]
                            }]
                        }, {
                            model: Movie
                        }],
                        transaction
                    });

                    if (!showtime || !showtime.screen || !showtime.screen.theater || !showtime.screen.theater.owner) {
                        throw new Error('Theater owner or showtime not found');
                    }

                    // 1. FAIL FAST: Check if ANY of these seats are already booked for THIS showtime
                    const occupiedTickets = await Ticket.findAll({
                        where: {
                            seatId: seatIds,
                            showtimeId
                        },
                        transaction
                    });

                    if (occupiedTickets.length > 0) {
                        console.error(`[ReservationConsumer] Failed - seats are already taken for booking ${trackingId}`);
                        await transaction.rollback();
                        return;
                    }

                    let couponForUsage: Coupon | null = null;
                    if (couponCode) {
                        couponForUsage = await Coupon.findOne({
                            where: { code: String(couponCode).toUpperCase() },
                            transaction,
                        });
                        if (couponForUsage) {
                            const userUsageCount = await CouponUsage.count({
                                where: { couponId: couponForUsage.id, userId },
                                transaction,
                            });
                            if (couponForUsage.perUserLimit !== null && userUsageCount >= couponForUsage.perUserLimit) {
                                throw new Error('Coupon per-user limit exceeded');
                            }
                            if (couponForUsage.maxUses !== null && couponForUsage.usedCount >= couponForUsage.maxUses) {
                                throw new Error('Coupon max uses exceeded');
                            }
                        }
                    }

                    // 2. PAYMENT PROCESSING (User Side)
                    if (paymentMethod === 'WALLET') {
                        let userWallet = await Wallet.findOne({ where: { userId, type: 'user' }, transaction });

                        if (!userWallet) {
                            const user = await User.findByPk(userId, { transaction });
                            if (user) {
                                userWallet = await Wallet.create({
                                    userId,
                                    type: 'user',
                                    balance: user.walletBalance || 0
                                }, { transaction });
                            }
                        }

                        if (!userWallet || Number(userWallet.balance) < Number(totalAmount)) {
                            throw new Error('Insufficient wallet balance');
                        }

                        // Deduct from User
                        userWallet.balance = Number(userWallet.balance) - Number(totalAmount);
                        await userWallet.save({ transaction });

                        // Sync legacy User.walletBalance
                        const user = await User.findByPk(userId, { transaction });
                        if (user) {
                            user.walletBalance = userWallet.balance;
                            await user.save({ transaction });
                        }

                        // Record Debit Transaction
                        await Transaction.create({
                            userId,
                            amount: -Number(totalAmount),
                            type: 'DEBIT',
                            description: `Booking #${trackingId}`
                        }, { transaction });
                    }

                    // 3. DISTRIBUTE EARNINGS (Owner & Platform)
                    const owner = showtime.screen.theater.owner;
                    const commissionRate = Number(owner.commissionRate) || 10;
                    const commissionAmount = (Number(totalAmount) * commissionRate) / 100;
                    const ownerAmount = Number(totalAmount) - commissionAmount;

                    // Update Owner Wallet
                    let ownerWallet = await Wallet.findOne({ where: { userId: owner.id, type: 'owner' }, transaction });
                    if (!ownerWallet) {
                        ownerWallet = await Wallet.create({ userId: owner.id, type: 'owner', balance: 0 }, { transaction });
                    }
                    ownerWallet.balance = Number(ownerWallet.balance) + ownerAmount;
                    await ownerWallet.save({ transaction });

                    // Update Platform Wallet
                    let platformWallet = await Wallet.findOne({ where: { type: 'platform' }, transaction });
                    if (!platformWallet) {
                        const superAdmin = await User.findOne({ where: { role: 'super_admin' }, transaction });
                        platformWallet = await Wallet.create({
                            type: 'platform',
                            balance: 0,
                            userId: superAdmin ? superAdmin.id : null
                        }, { transaction });
                    }
                    platformWallet.balance = Number(platformWallet.balance) + commissionAmount;
                    await platformWallet.save({ transaction });

                    // Record Transactions
                    await Transaction.create({
                        userId: platformWallet.userId || 1,
                        amount: Number(commissionAmount),
                        type: 'CREDIT',
                        description: `Platform Earnings from Booking #${trackingId}`
                    }, { transaction });

                    await Transaction.create({
                        userId: owner.id,
                        amount: Number(ownerAmount),
                        type: 'CREDIT',
                        description: `Earnings from Booking #${trackingId}`
                    }, { transaction });

                    // 4. Create Booking & Tickets
                    const booking = await Booking.create({
                        userId,
                        showtimeId,
                        totalAmount,
                        status: 'confirmed'
                    }, { transaction });

                    const tickets = seatIds.map((seatId: number) => ({
                        bookingId: booking.id,
                        showtimeId,
                        seatId,
                    }));
                    await Ticket.bulkCreate(tickets, { transaction });

                    // Create Food Item entries if any
                    if (foodItems && Array.isArray(foodItems)) {
                        const foodEntries = foodItems.map((item: any) => ({
                            bookingId: booking.id,
                            foodItemId: item.id,
                            quantity: item.quantity,
                            priceAtBooking: item.price
                        }));
                        await BookingFoodItem.bulkCreate(foodEntries, { transaction });
                    }

                    if (couponForUsage) {
                        await CouponUsage.create({
                            couponId: couponForUsage.id,
                            userId,
                            bookingId: booking.id,
                        }, { transaction });
                        couponForUsage.usedCount = Number(couponForUsage.usedCount) + 1;
                        await couponForUsage.save({ transaction });
                    }

                    await transaction.commit();

                    console.log(`[ReservationConsumer] Successfully processed booking ${booking.id} for user ${userId}`);

                    // Fetch Seat Labels for Email
                    const seatObjects = await Seat.findAll({ where: { id: seatIds } });
                    const seatLabels = seatObjects.map(s => `${s.row}${s.number}`);

                    // Release the locks after successful booking
                    await LockService.releaseLock(showtimeId, seatIds, userId);

                    // 4. Produce booking confirmed event for other services (Email, Analytics)
                    try {
                        const producer = await getProducer();
                        if (producer) {
                            await producer.send({
                                topic: 'booking-events',
                                messages: [{
                                    value: JSON.stringify({
                                        userId,
                                        showtimeId,
                                        totalAmount,
                                        bookingId: booking.id,
                                        trackingId,
                                        type: 'BOOKING_CONFIRMED',
                                        movieTitle: showtime.movie.title,
                                        seats: seatLabels,
                                        showtime: showtime.startTime,
                                        timestamp: new Date().toISOString()
                                    })
                                }]
                            });
                        }
                    } catch (eventError) {
                        console.error('[ReservationConsumer] Failed to publish confirmation event:', eventError);
                    }

                } catch (error) {
                    await transaction.rollback();
                    console.error(`[ReservationConsumer] Fatal error for trackingId ${trackingId}:`, error);
                }
            },
        });
    } catch (err) {
        console.error('[ReservationConsumer] Fatal error starting:', err);
    }
};
