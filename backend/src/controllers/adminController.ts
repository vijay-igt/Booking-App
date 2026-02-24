import { Request, Response } from 'express';
import { DataType, Sequelize } from 'sequelize-typescript';
import { Theater } from '../models/Theater';
import { Screen } from '../models/Screen';
import { Seat } from '../models/Seat';
import { Showtime } from '../models/Showtime';
import { Movie } from '../models/Movie';
import { Booking } from '../models/Booking';
import { Ticket } from '../models/Ticket';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import { Notification } from '../models/Notification';
import { sendNotificationToSuperAdmins } from '../services/websocketService';
import { getProducer } from '../config/kafkaClient';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { Transaction } from '../models/Transaction';

const internalGenerateSeats = async (screenId: number, layout: any) => {
    const { tiers, columns } = layout;
    const seatsData = [];

    if (tiers && Array.isArray(tiers) && tiers.length > 0) {
        let currentRowIndex = 0;
        const cols = columns || 10;

        for (const tier of tiers) {
            for (let i = 0; i < tier.rows; i++) {
                const rowLabel = String.fromCharCode(65 + currentRowIndex); // A, B, C...
                for (let c = 1; c <= cols; c++) {
                    seatsData.push({
                        screenId,
                        row: rowLabel,
                        number: c,
                        type: tier.name,
                        price: tier.price
                    });
                }
                currentRowIndex++;
            }
        }
    }

    if (seatsData.length > 0) {
        // Clear existing seats for this screen before generating new ones
        await Seat.destroy({ where: { screenId } });
        await Seat.bulkCreate(seatsData);
    }
    return seatsData.length;
};

export const createTheater = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, location } = req.body;
        const ownerId = req.user!.id; // Assign logged-in user as owner
        const theater = await Theater.create({ name, location, ownerId });
        res.status(201).json(theater);
    } catch (error) {
        res.status(500).json({ message: 'Error creating theater', error });
    }
};

export const getTheaters = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user!;
        let whereClause = {};
        if (user.role !== 'super_admin') {
            whereClause = { ownerId: user.id };
        }
        const theaters = await Theater.findAll({
            where: whereClause,
            include: [
                Screen,
                {
                    model: User,
                    attributes: ['id', 'name', 'email']
                }
            ]
        });
        res.json(theaters);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching theaters', error });
    }
};

export const deleteTheater = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);
        const user = req.user!;
        const theater = await Theater.findByPk(id);

        if (!theater) {
            res.status(404).json({ message: 'Theater not found' });
            return;
        }

        if (user.role !== 'super_admin' && theater.ownerId !== user.id) {
            res.status(403).json({ message: 'Access denied. You do not own this theater.' });
            return;
        }

        await theater.destroy();
        res.json({ message: 'Theater deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting theater', error });
    }
};

export const createScreen = async (req: Request, res: Response): Promise<void> => {
    try {
        const { theaterId, name, seatLayout } = req.body;

        const existingScreen = await Screen.findOne({ where: { theaterId, name } });
        if (existingScreen) {
            res.status(400).json({ message: `A screen with name "${name}" already exists in this theater.` });
            return;
        }

        const screen = await Screen.create({ theaterId, name });

        // Auto-generate seats if layout provided
        if (seatLayout) {
            await internalGenerateSeats(screen.id, seatLayout);
        }

        res.status(201).json(screen);
    } catch (error) {
        res.status(500).json({ message: 'Error creating screen', error });
    }
};

export const updateScreen = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const user = req.user!;

        const screen = await Screen.findByPk(parseInt(String(id)), { include: [Theater] });
        if (!screen) {
            res.status(404).json({ message: 'Screen not found' });
            return;
        }

        if (user.role !== 'super_admin' && screen.theater?.ownerId !== user.id) {
            res.status(403).json({ message: 'Access denied. You do not own this screen.' });
            return;
        }

        screen.name = name;
        await screen.save();
        res.json(screen);
    } catch (error) {
        res.status(500).json({ message: 'Error updating screen', error });
    }
};

export const deleteScreen = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user = req.user!;

        const screen = await Screen.findByPk(parseInt(String(id)), { include: [Theater] });
        if (!screen) {
            res.status(404).json({ message: 'Screen not found' });
            return;
        }

        if (user.role !== 'super_admin' && screen.theater?.ownerId !== user.id) {
            res.status(403).json({ message: 'Access denied' });
            return;
        }

        await screen.destroy();
        res.json({ message: 'Screen deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting screen', error });
    }
};

export const generateSeats = async (req: Request, res: Response): Promise<void> => {
    try {
        const { screenId } = req.params;
        const { tiers, columns } = req.body;

        const screen = await Screen.findByPk(parseInt(String(screenId)));
        if (!screen) { res.status(404).json({ message: 'Screen not found' }); return; }

        const count = await internalGenerateSeats(screen.id, { tiers, columns });
        res.status(201).json({ message: `Generated ${count} seats.` });
    } catch (error) {
        res.status(500).json({ message: 'Error generating seats', error });
    }
};

export const getScreenTiers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { screenId } = req.params;
        const tiers = await Seat.findAll({
            where: { screenId },
            attributes: [
                [Sequelize.fn('DISTINCT', Sequelize.col('type')), 'name'],
                [Sequelize.col('price'), 'price']
            ],
            group: ['type', 'price'],
            raw: true
        });
        res.json(tiers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tiers', error });
    }
};

export const getSeatsByScreen = async (req: Request, res: Response): Promise<void> => {
    try {
        const { screenId } = req.params;
        const seats = await Seat.findAll({ where: { screenId } });
        res.json(seats);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching seats', error });
    }
};

export const getAllShowtimes = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user!;

        const showtimes = await Showtime.findAll({
            include: [
                { model: Movie },
                {
                    model: Screen,
                    required: true,
                    include: [{
                        model: Theater,
                        required: true,
                        where: user.role !== 'super_admin' ? { ownerId: user.id } : {}
                    }]
                }
            ],
            order: [['startTime', 'ASC']]
        });
        res.json(showtimes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching showtimes', error });
    }
};

export const deleteShowtime = async (req: Request, res: Response): Promise<void> => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const user = req.user!;

        const showtime = await Showtime.findByPk(parseInt(String(id)), {
            include: [
                {
                    model: Screen,
                    include: [{
                        model: Theater,
                        include: [User],
                    }]
                },
                {
                    model: Movie
                }
            ],
            transaction,
        });

        if (!showtime) {
            await transaction.rollback();
            res.status(404).json({ message: 'Showtime not found' });
            return;
        }

        if (user.role !== 'super_admin' && showtime.screen?.theater?.ownerId !== user.id) {
            await transaction.rollback();
            res.status(403).json({ message: 'Access denied. You do not own this showtime.' });
            return;
        }

        const bookings = await Booking.findAll({
            where: { showtimeId: showtime.id },
            include: [{ model: User }],
            transaction,
        });

        const refundedUserIds: number[] = [];

        if (bookings.length > 0) {
            const theaterOwner = showtime.screen?.theater?.owner ?? null;

            for (const booking of bookings) {
                let bookingUser: User | null = booking.user;
                if (!bookingUser) {
                    bookingUser = await User.findByPk(booking.userId, { transaction });
                    if (!bookingUser) {
                        console.error(`[deleteShowtime] Booking user not found for booking ${booking.id}, skipping refund but deleting booking.`);

                        await Ticket.destroy({
                            where: { bookingId: booking.id },
                            transaction,
                        });
                        await booking.destroy({ transaction });
                        continue;
                    }
                }

                const totalAmount = Number(booking.totalAmount);
                const commissionRate = theaterOwner ? (Number(theaterOwner.commissionRate) || 10) : 0;
                const commissionAmount = (totalAmount * commissionRate) / 100;
                const ownerAmount = theaterOwner ? (totalAmount - commissionAmount) : 0;

                booking.status = 'cancelled';
                booking.refunded = true;
                booking.cancellationReason = 'showtime_cancelled';
                await booking.save({ transaction });

                if (theaterOwner && ownerAmount > 0) {
                    let ownerWallet = await Wallet.findOne({ where: { userId: theaterOwner.id, type: 'owner' }, transaction });
                    if (ownerWallet) {
                        ownerWallet.balance = Number(ownerWallet.balance) - ownerAmount;
                        await ownerWallet.save({ transaction });
                        await Transaction.create({
                            walletId: ownerWallet.id,
                            userId: theaterOwner.id,
                            type: 'DEBIT',
                            amount: ownerAmount,
                            description: `Showtime cancellation debit for booking ID: ${booking.id}`,
                        }, { transaction });
                    }
                }

                if (commissionAmount > 0) {
                    let platformWallet = await Wallet.findOne({ where: { type: 'platform' }, transaction });
                    if (platformWallet) {
                        platformWallet.balance = Number(platformWallet.balance) - commissionAmount;
                        await platformWallet.save({ transaction });
                        await Transaction.create({
                            walletId: platformWallet.id,
                            userId: platformWallet.userId,
                            type: 'DEBIT',
                            amount: commissionAmount,
                            description: `Showtime cancellation commission debit for booking ID: ${booking.id}`,
                        }, { transaction });
                    }
                }

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
                    description: `Showtime cancellation refund for booking ID: ${booking.id}`,
                }, { transaction });

                const userRecord = await User.findByPk(bookingUser.id, { transaction });
                if (userRecord) {
                    userRecord.walletBalance = userWallet.balance;
                    await userRecord.save({ transaction });
                }

                await Ticket.destroy({
                    where: { bookingId: booking.id },
                    transaction,
                });
                await booking.destroy({ transaction });

                if (!refundedUserIds.includes(bookingUser.id)) {
                    refundedUserIds.push(bookingUser.id);
                }
            }
        }

        await showtime.destroy({ transaction });
        await transaction.commit();

        if (bookings.length > 0) {
            try {
                const producer = await getProducer();
                if (producer) {
                    const movieTitle = showtime.movie?.title || 'your movie';
                    const theaterName = showtime.screen?.theater?.name || showtime.screen?.name || 'the theater';
                    const start = new Date(showtime.startTime);
                    const startTimeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const startDateStr = start.toLocaleDateString([], { month: 'short', day: 'numeric' });

                    const title = 'Showtime cancelled';
                    const message = `Your showtime for ${movieTitle} at ${theaterName} on ${startDateStr} at ${startTimeStr} has been cancelled. Your payment has been refunded to your wallet.`;

                    const messages = refundedUserIds.map((userId: number) => ({
                        value: JSON.stringify({
                            userId,
                            title,
                            message,
                            type: 'warning',
                        }),
                    }));

                    if (messages.length > 0) {
                        await producer.send({
                            topic: 'single-notifications',
                            messages,
                        });
                    }
                }
            } catch (notifyError) {
                console.error('[deleteShowtime] Failed to send cancellation notifications:', notifyError);
            }
        }

        res.json({ message: 'Showtime deleted, bookings cancelled and refunded.' });
    } catch (error) {
        await transaction.rollback();
        res.status(500).json({ message: 'Error deleting showtime', error });
    }
};

export const getAllBookings = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user!;

        const bookings = await Booking.findAll({
            include: [
                { model: User, attributes: ['id', 'name', 'email'] },
                {
                    model: Showtime,
                    required: true,
                    include: [
                        { model: Movie, attributes: ['title'] },
                        {
                            model: Screen,
                            required: true,
                            include: [{
                                model: Theater,
                                required: true,
                                where: user.role !== 'super_admin' ? { ownerId: user.id } : {}
                            }]
                        }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bookings', error });
    }
};



export const deleteBooking = async (req: Request, res: Response): Promise<void> => {
    const transaction = await sequelize.transaction();
    let notificationUserId: number | null = null;
    let notificationShowtimeId: number | null = null;
    let wasRefunded = false;

    try {
        const { id } = req.params;
        const booking = await Booking.findByPk(id, {
            include: [
                {
                    model: Showtime,
                    include: [
                        { model: Movie },
                        { model: Screen, include: [Theater] },
                    ],
                },
                {
                    model: User,
                },
            ],
            transaction,
        });

        if (!booking) {
            await transaction.rollback();
            res.status(404).json({ message: 'Booking not found' });
            return;
        }

        const totalAmount = Number(booking.totalAmount);
        const showtime = booking.showtime;
        const theaterOwner = showtime?.screen?.theater?.owner ?? null;

        let bookingUser: User | null = booking.user;
        if (!bookingUser) {
            bookingUser = await User.findByPk(booking.userId, { transaction });
        }

        booking.status = 'cancelled';
        await booking.save({ transaction });

        const showtimeStartTime = showtime ? new Date(showtime.startTime) : null;
        const currentTime = new Date();
        const isBeforeShowtime = showtimeStartTime ? currentTime < showtimeStartTime : false;

        const commissionRate = theaterOwner ? (Number(theaterOwner.commissionRate) || 10) : 0;
        const commissionAmount = (totalAmount * commissionRate) / 100;
        const ownerAmount = theaterOwner ? (totalAmount - commissionAmount) : 0;

        if (theaterOwner && ownerAmount > 0) {
            let ownerWallet = await Wallet.findOne({ where: { userId: theaterOwner.id, type: 'owner' }, transaction });
            if (ownerWallet) {
                ownerWallet.balance = Number(ownerWallet.balance) - ownerAmount;
                await ownerWallet.save({ transaction });
                await Transaction.create({
                    walletId: ownerWallet.id,
                    userId: theaterOwner.id,
                    type: 'DEBIT',
                    amount: ownerAmount,
                    description: `Booking cancellation debit for booking ID: ${booking.id}`,
                }, { transaction });
            }
        }

        if (commissionAmount > 0) {
            let platformWallet = await Wallet.findOne({ where: { type: 'platform' }, transaction });
            if (platformWallet) {
                platformWallet.balance = Number(platformWallet.balance) - commissionAmount;
                await platformWallet.save({ transaction });
                await Transaction.create({
                    walletId: platformWallet.id,
                    userId: platformWallet.userId,
                    type: 'DEBIT',
                    amount: commissionAmount,
                    description: `Booking cancellation commission debit for booking ID: ${booking.id}`,
                }, { transaction });
            }
        }

        if (isBeforeShowtime && bookingUser) {
            booking.refunded = true;
            booking.cancellationReason = 'admin_cancelled_refunded';
            await booking.save({ transaction });

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
                description: `Booking cancellation refund for booking ID: ${booking.id}`,
            }, { transaction });

            const userRecord = await User.findByPk(bookingUser.id, { transaction });
            if (userRecord) {
                userRecord.walletBalance = userWallet.balance;
                await userRecord.save({ transaction });
            }

            wasRefunded = true;
        }

        await Ticket.destroy({
            where: { bookingId: booking.id },
            transaction,
        });

        notificationUserId = bookingUser?.id ?? null;
        notificationShowtimeId = showtime?.id ?? null;

        await booking.destroy({ transaction });

        await transaction.commit();

        if (notificationUserId && notificationShowtimeId && wasRefunded) {
            try {
                const producer = await getProducer();
                if (producer) {
                    await producer.send({
                        topic: 'booking-events',
                        messages: [{
                            value: JSON.stringify({
                                type: 'BOOKING_CANCELLED_ADMIN',
                                bookingId: Number(id),
                                userId: notificationUserId,
                                showtimeId: notificationShowtimeId,
                            }),
                        }],
                    });
                }
            } catch (kafkaError) {
                console.error('[deleteBooking] Error sending Kafka cancellation event:', kafkaError);
            }
        }

        res.json({
            message: 'Booking cancelled successfully' + (wasRefunded ? ' and refunded.' : '. No refund issued (after showtime or missing user).'),
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error cancelling booking:', error);
        res.status(500).json({ message: 'Error cancelling booking', error });
    }
};

export const getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search as string;
        const role = req.query.role as string;

        const whereClause: any = {};

        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } }
            ];
        }

        if (role && role !== 'all') {
            whereClause.role = role;
        } else if (!role || role === 'all') {
            // If no specific role filter, exclude super_admin by default
            whereClause.role = { [Op.ne]: 'super_admin' };
        }

        const { count, rows } = await User.findAndCountAll({
            where: whereClause,
            attributes: { exclude: ['passwordHash'] },
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        res.json({
            users: rows,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users', error });
    }
};

export const updateUserCommission = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { commissionRate } = req.body;

        if (commissionRate === undefined || commissionRate < 0 || commissionRate > 100) {
            res.status(400).json({ message: 'Invalid commission rate. Must be between 0 and 100.' });
            return;
        }

        const userToUpdate = await User.findByPk(id);
        if (!userToUpdate) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }

        if (userToUpdate.role !== 'admin') {
            res.status(400).json({ message: 'Commission rate can only be set for Theater Owners (admins).' });
            return;
        }

        userToUpdate.commissionRate = commissionRate;
        await userToUpdate.save();

        res.json({ message: 'Commission rate updated successfully.', user: userToUpdate });
    } catch (error) {
        res.status(500).json({ message: 'Error updating commission', error });
    }
};

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user!;
        let stats = {};

        if (user.role === 'super_admin') {
            const platformWallet = await Wallet.findOne({ where: { type: 'platform' } });
            const totalRevenue = platformWallet ? Number(platformWallet.balance) : 0;
            const totalOwners = await User.count({ where: { role: 'admin' } });
            const pendingApprovals = await User.count({ where: { adminRequestStatus: 'PENDING' } });

            stats = {
                totalRevenue,
                totalOwners,
                pendingApprovals
            };
        } else {
            const totalBookings = await Booking.count({
                include: [{
                    model: Showtime,
                    required: true,
                    include: [{
                        model: Screen,
                        required: true,
                        include: [{
                            model: Theater,
                            required: true,
                            where: { ownerId: user.id }
                        }]
                    }]
                }]
            });

            const ownerWallet = await Wallet.findOne({ where: { userId: user.id, type: 'owner' } });
            const totalEarnings = ownerWallet ? Number(ownerWallet.balance) : 0;

            const result = await Booking.findOne({
                attributes: [
                    [Sequelize.fn('SUM', Sequelize.col('totalAmount')), 'totalAmount']
                ],
                where: {
                    status: {
                        [Op.ne]: 'cancelled' // Exclude cancelled bookings
                    }
                },
                include: [{
                    model: Showtime,
                    required: true,
                    attributes: [],
                    include: [{
                        model: Screen,
                        required: true,
                        attributes: [],
                        include: [{
                            model: Theater,
                            required: true,
                            attributes: [],
                            where: { ownerId: user.id }
                        }]
                    }]
                }],
                raw: true
            });

            const bookingsSum = (result as any)?.totalAmount || 0;
            const totalRevenue = Number(bookingsSum) || 0;
            const commissionPaid = Math.max(totalRevenue - totalEarnings, 0);

            stats = {
                totalBookings,
                totalEarnings,
                commissionPaid,
                commissionRate: user.commissionRate
            };
        }

        res.json(stats);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats', error });
    }
};

export const approveOwnerRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'APPROVE' or 'REJECT'

        if (!['APPROVE', 'REJECT'].includes(action)) {
            res.status(400).json({ message: 'Invalid action. Use APPROVE or REJECT.' });
            return;
        }

        const user = await User.findByPk(id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (user.adminRequestStatus !== 'PENDING') {
            res.status(400).json({ message: 'User does not have a pending request.' });
            return;
        }

        if (action === 'APPROVE') {
            user.role = 'admin';
            user.adminRequestStatus = 'APPROVED';

            // Create owner wallet if not exists
            const existingWallet = await Wallet.findOne({ where: { userId: user.id, type: 'owner' } });
            if (!existingWallet) {
                await Wallet.create({
                    userId: user.id,
                    balance: 0,
                    currency: 'INR',
                    type: 'owner'
                });
            }
        } else {
            user.adminRequestStatus = 'REJECTED';
        }

        await user.save();
        res.json({ message: `Request ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`, user });
    } catch (error) {
        res.status(500).json({ message: 'Error processing request', error });
    }
};

export const requestMissingMovie = async (req: Request, res: Response): Promise<void> => {
    try {
        const { movieName, notes } = req.body;
        const user = req.user!; // The requester

        if (!movieName) {
            res.status(400).json({ message: 'Movie name is required' });
            return;
        }

        // 1. Construct the message
        const title = "New Movie Request";
        const message = `Theater Admin ${user.name || user.email} (ID: ${user.id}) requested to add movie: "${movieName}".${notes ? ` Notes: ${notes}` : ''}`;

        // 2. Send WebSocket Notification to Super Admins
        sendNotificationToSuperAdmins({
            type: 'ADMIN_MOVIE_REQUEST',
            title,
            message,
            requesterId: user.id,
            movieName,
            timestamp: new Date()
        });

        // 3. Persist Notification in DB for all Super Admins
        const superAdmins = await User.findAll({ where: { role: 'super_admin' } });

        const notifications = superAdmins.map(admin => ({
            userId: admin.id,
            title,
            message,
            type: 'info',
            isRead: false
        }));

        if (notifications.length > 0) {
            await Notification.bulkCreate(notifications);
        }

        res.status(200).json({ message: 'Request sent to Super Admin' });
    } catch (error) {
        console.error('Error requesting movie:', error);
        res.status(500).json({ message: 'Error sending request', error });
    }
};
