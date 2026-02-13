import { Request, Response } from 'express';
import { ModelCtor } from 'sequelize-typescript';
import { Booking } from '../models/Booking';
import { Showtime } from '../models/Showtime';
import { Seat } from '../models/Seat';
import { Ticket } from '../models/Ticket';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { Movie } from '../models/Movie';
import { Screen } from '../models/Screen';
import { Theater } from '../models/Theater';
import { sequelize } from '../config/database';
import { getProducer } from '../config/kafkaClient';
import { LockService } from '../services/lockService';
import { isAxiosError } from 'axios';

export const createBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, showtimeId, seatIds, totalAmount, paymentMethod } = req.body;

        if (!userId || !showtimeId || !seatIds || !totalAmount) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }

        // Validate Seat Locks
        const hasLock = await LockService.validateLock(showtimeId, seatIds, userId);
        if (!hasLock) {
            res.status(409).json({ message: 'Session expired or seats are no longer reserved.' });
            return;
        }

        const trackingId = `BOOK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Wallet Balance Check (Synchronous pre-check)
        if (paymentMethod === 'WALLET') {
            const user = await User.findByPk(userId);
            if (!user || Number(user.walletBalance) < Number(totalAmount)) {
                res.status(400).json({ message: 'Insufficient wallet balance' });
                return;
            }
        }

        // Produce seat reservation event
        const producer = await getProducer();
        if (producer) {
            await producer.send({
                topic: 'seat-reservations',
                messages: [{
                    value: JSON.stringify({
                        userId,
                        showtimeId,
                        seatIds,
                        totalAmount,
                        paymentMethod,
                        trackingId
                    })
                }]
            });

            console.log(`[BookingController] Dispatched reservation request: ${trackingId}`);

            res.status(202).json({
                message: 'Your booking is being processed. You will be notified shortly.',
                trackingId
            });
        } else {
            // Fallback (Direct DB insert if Kafka is down)
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
                    }] as any,
                    transaction
                });

                if (!showtime || !showtime.screen || !showtime.screen.theater || !showtime.screen.theater.owner) {
                    await transaction.rollback();
                    res.status(400).json({ message: 'Showtime or theater owner not found for processing' });
                    return;
                }

                // 1. FAIL FAST: Check if any seat is already booked for THIS showtime
                const existingTickets = await Ticket.findAll({
                    include: [{ model: Booking, where: { showtimeId, status: 'confirmed' } }],
                    where: { seatId: seatIds },
                    transaction
                });

                if (existingTickets.length > 0) {
                    await transaction.rollback();
                    res.status(400).json({ message: 'One or more seats are already booked.' });
                    return;
                }

                // 2. PAYMENT PROCESSING (User Side)
                if (paymentMethod === 'WALLET') {
                    // Get User Wallet
                    let userWallet = await Wallet.findOne({ where: { userId, type: 'user' }, transaction });

                    // Fallback to User.walletBalance if Wallet not found
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
                        await transaction.rollback();
                        res.status(400).json({ message: 'Insufficient wallet balance' });
                        return;
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
                    userId: platformWallet.userId,
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
                const booking = await Booking.create({ userId, showtimeId, totalAmount, status: 'confirmed' }, { transaction });
                const tickets = seatIds.map((seatId: number) => ({ bookingId: booking.id, showtimeId, seatId }));
                await Ticket.bulkCreate(tickets, { transaction });
                await transaction.commit();


                res.status(201).json({ message: 'Booking successful (fallback)', booking });
            } catch (err) {
                if (transaction) await transaction.rollback();
                throw err;
            }
        }
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ message: 'Error creating booking' });
    }
};

export const getUserBookings = async (req: Request, res: Response): Promise<void> => {
    console.log('[getUserBookings] Function started.');
    console.log('[getUserBookings] Authorization Header:', req.headers.authorization);
    try {
        const { userId } = req.params;
        console.log(`[getUserBookings] Received request for userId: ${userId}`);
        const bookings = await Booking.findAll({
            where: { userId },
            include: [{
                model: Ticket,
                include: [Seat]
            }, {
                model: Showtime,
                include: [
                    { model: Movie },
                    { model: Screen, include: [Theater] }
                ] as any,
            }],
        });
        console.log(`[getUserBookings] Found ${bookings.length} bookings for userId: ${userId}`);
        console.log('[getUserBookings] Sending response.');
        res.json(bookings);
    } catch (error) {
        console.error('[getUserBookings] Error fetching bookings:', error);
        res.status(500).json({ message: 'Error fetching bookings', error });
    }
};

export const cancelUserBooking = async (req: Request, res: Response): Promise<void> => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params; // Booking ID
        const userId = req.user!.id; // Authenticated user's ID

        console.log(`[cancelUserBooking] Attempting to cancel booking with ID: ${id} for user: ${userId}`);

        const booking = await Booking.findByPk(id, {
            include: [
                {
                    model: Showtime,
                    include: [
                        {
                            model: Movie,
                        },
                        {
                            model: Screen,
                            include: [
                                {
                                    model: Theater,
                                    include: [User], // Include User to get owner details
                                },
                            ],
                        },
                    ],
                },
                {
                    model: User, // Include User to get booking user details
                },
            ],
            transaction,
        });

        if (!booking) {
            console.log(`[cancelUserBooking] Booking with ID: ${id} not found.`);
            await transaction.rollback();
            res.status(404).json({ message: 'Booking not found' });
            return;
        }
        console.log(`[cancelUserBooking] Booking with ID: ${id} found. Status: ${booking.status}`);

        if (booking.userId !== userId) {
            await transaction.rollback();
            res.status(403).json({ message: 'You are not authorized to cancel this booking.' });
            return;
        }

        if (booking.status === 'cancelled') {
            await transaction.rollback();
            res.status(400).json({ message: 'Booking is already cancelled.' });
            return;
        }

        const showtime = booking.showtime;
        if (!showtime) {
            await transaction.rollback();
            res.status(500).json({ message: 'Associated showtime not found.' });
            return;
        }

        // Check if cancellation is allowed (before 1 day of showtime)
        const showtimeStartTime = new Date(showtime.startTime);
        const cancellationDeadline = new Date(showtimeStartTime.getTime() - (24 * 60 * 60 * 1000)); // 24 hours before
        const currentTime = new Date();

        if (currentTime >= cancellationDeadline) {
            await transaction.rollback();
            res.status(400).json({ message: 'Booking can only be cancelled up to 24 hours before showtime.' });
            return;
        }

        // Update booking status to 'cancelled'
        booking.status = 'cancelled';
        await booking.save({ transaction });

        // Financial reversal and refund logic (similar to admin cancellation)
        const totalAmount = Number(booking.totalAmount);
        const theaterOwner = showtime?.screen?.theater?.owner;
        const bookingUser = booking.user;

        if (!theaterOwner || !bookingUser) {
            await transaction.rollback();
            res.status(500).json({ message: 'Associated owner or user not found' });
            return;
        }

        const commissionRate = Number(theaterOwner.commissionRate) || 10;
        const commissionAmount = (totalAmount * commissionRate) / 100;
        const ownerAmount = totalAmount - commissionAmount;

        // 1. Reverse owner's wallet update
        let ownerWallet = await Wallet.findOne({ where: { userId: theaterOwner.id, type: 'owner' }, transaction });
        if (ownerWallet) {
            ownerWallet.balance = Number(ownerWallet.balance) - ownerAmount;
            await ownerWallet.save({ transaction });
            await Transaction.create({
                walletId: ownerWallet.id,
                userId: theaterOwner.id,
                type: 'DEBIT',
                amount: ownerAmount,
                description: `User booking cancellation debit for booking ID: ${booking.id}`,
            }, { transaction });
        }

        // 2. Reverse platform's wallet update
        let platformWallet = await Wallet.findOne({ where: { type: 'platform' }, transaction });
        if (platformWallet) {
            platformWallet.balance = Number(platformWallet.balance) - commissionAmount;
            await platformWallet.save({ transaction });
            await Transaction.create({
                walletId: platformWallet.id,
                userId: platformWallet.userId, // Use platformWallet's userId
                type: 'DEBIT',
                amount: commissionAmount,
                description: `User booking cancellation commission debit for booking ID: ${booking.id}`,
            }, { transaction });
        }

        // 3. Refund user's wallet
        let userWallet = await Wallet.findOne({ where: { userId: bookingUser.id, type: 'user' }, transaction });
        if (!userWallet) {
            userWallet = await Wallet.create({ userId: bookingUser.id, type: 'user', balance: 0 }, { transaction });
        }
        userWallet.balance = Number(userWallet.balance) + totalAmount;
        await userWallet.save({ transaction });
        await Transaction.create({
            walletId: userWallet.id,
            userId: bookingUser.id,
            type: 'CREDIT',
            amount: totalAmount,
            description: `User booking cancellation refund for booking ID: ${booking.id}`,
        }, { transaction });

        // Update seat availability by deleting tickets
        await Ticket.destroy({
            where: { bookingId: booking.id },
            transaction,
        });

        await transaction.commit();

        // Produce booking cancelled event for other services (Email, Analytics, Notifications)
        try {
            const producer = await getProducer();
            if (producer) {
                await producer.send({
                    topic: 'booking-events',
                    messages: [{
                        value: JSON.stringify({
                            bookingId: booking.id,
                            userId: booking.userId,
                            status: 'cancelled',
                            message: `Your booking for ${showtime.movie.title} on ${showtime.startTime} has been cancelled and refunded.`
                        })
                    }]
                });
                console.log(`[BookingController] Dispatched cancellation event for booking: ${booking.id}`);
            }
        } catch (kafkaError) {
            console.error('[BookingController] Error sending Kafka cancellation event:', kafkaError);
            // Log error but don't block response as booking is already cancelled in DB
        }

        res.json({ message: 'Booking cancelled successfully and refunded.' });

    } catch (error) {
        await transaction.rollback();
        console.error('Error cancelling user booking:', error);
        res.status(500).json({ message: 'Error cancelling user booking', error });
    }
};
