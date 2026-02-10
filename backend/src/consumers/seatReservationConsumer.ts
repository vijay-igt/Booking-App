import { getConsumer, getProducer } from '../utils/kafka';
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
                const { userId, showtimeId, seatIds, totalAmount, trackingId, paymentMethod } = JSON.parse(message.value.toString());

                // Validate Seat Locks
                const hasLock = await LockService.validateLock(showtimeId, seatIds, userId);
                if (!hasLock) {
                    console.warn(`[ReservationConsumer] Lock for showtime ${showtimeId}, seats ${seatIds} by user ${userId} is invalid or expired. Booking ${trackingId} aborted.`);
                    return; // Abort processing if lock is invalid
                }

                const transaction = await sequelize.transaction();
                try {
                    // WALLET PAYMENT PROCESSING
                    if (paymentMethod === 'WALLET') {
                        const user = await User.findByPk(userId, { transaction });
                        if (!user || Number(user.walletBalance) < Number(totalAmount)) {
                            throw new Error('Insufficient wallet balance');
                        }

                        // Deduct balance
                        user.walletBalance = Number(user.walletBalance) - Number(totalAmount);
                        await user.save({ transaction });

                        // Record Transaction
                        await Transaction.create({
                            userId: user.id,
                            amount: -Number(totalAmount),
                            type: 'DEBIT',
                            description: `Booking #${trackingId}`
                        }, { transaction });
                    }

                    // 1. Check if ANY of these seats are already booked for THIS showtime
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

                    // 2. Create Booking
                    const booking = await Booking.create({
                        userId,
                        showtimeId,
                        totalAmount,
                        status: 'confirmed'
                    }, { transaction });

                    // 3. Create Tickets (This marks the seats as taken for this showtime)
                    const tickets = seatIds.map((seatId: number) => ({
                        bookingId: booking.id,
                        showtimeId,
                        seatId,
                    }));
                    await Ticket.bulkCreate(tickets, { transaction });

                    await transaction.commit();
                    console.log(`[ReservationConsumer] Successfully processed booking ${booking.id} for user ${userId}`);

                    // Release the locks after successful booking
                    await LockService.releaseLock(showtimeId, seatIds);

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
