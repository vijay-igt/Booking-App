import { Request, Response } from 'express';
import { Theater } from '../models/Theater';
import { Screen } from '../models/Screen';
import { Seat } from '../models/Seat';
import { Showtime } from '../models/Showtime';
import { Movie } from '../models/Movie';
import { Booking } from '../models/Booking';
import { Ticket } from '../models/Ticket';
import { User } from '../models/User';

export const createTheater = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, location } = req.body;
        const theater = await Theater.create({ name, location });
        res.status(201).json(theater);
    } catch (error) {
        res.status(500).json({ message: 'Error creating theater', error });
    }
};

export const getTheaters = async (req: Request, res: Response): Promise<void> => {
    try {
        const theaters = await Theater.findAll({ include: [Screen] });
        res.json(theaters);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching theaters', error });
    }
};

export const createScreen = async (req: Request, res: Response): Promise<void> => {
    try {
        const { theaterId, name } = req.body;

        const existingScreen = await Screen.findOne({ where: { theaterId, name } });
        if (existingScreen) {
            res.status(400).json({ message: `A screen with name "${name}" already exists in this theater.` });
            return;
        }

        const screen = await Screen.create({ theaterId, name });
        res.status(201).json(screen);
    } catch (error) {
        res.status(500).json({ message: 'Error creating screen', error });
    }
};

export const updateScreen = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const screen = await Screen.findByPk(parseInt(String(id)));
        if (!screen) {
            res.status(404).json({ message: 'Screen not found' });
            return;
        }

        const existingScreen = await Screen.findOne({
            where: {
                theaterId: screen.theaterId,
                name
            }
        });

        if (existingScreen && existingScreen.id !== screen.id) {
            res.status(400).json({ message: `A screen with name "${name}" already exists in this theater.` });
            return;
        }

        await screen.update({ name });
        res.json(screen);
    } catch (error) {
        res.status(500).json({ message: 'Error updating screen', error });
    }
};

export const deleteScreen = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const screen = await Screen.findByPk(parseInt(String(id)));
        if (!screen) {
            res.status(404).json({ message: 'Screen not found' });
            return;
        }
        await screen.destroy();
        res.json({ message: 'Screen deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting screen', error });
    }
};

export const generateSeats = async (req: Request, res: Response): Promise<void> => {
    try {
        const { screenId, rows, cols, price } = req.body;
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

        // 1. Fetch all existing seats for this screen
        const existingSeats = await Seat.findAll({ where: { screenId } });

        // Map simplified key (Row-Num) to Seat ID
        const existingSeatMap = new Map<string, Seat>();
        existingSeats.forEach(seat => {
            // console.log(`Existing: ${seat.row}-${seat.number} (ID: ${seat.id})`);
            existingSeatMap.set(`${seat.row}-${seat.number}`, seat);
        });

        console.log(`Found ${existingSeats.length} existing seats for Screen ${screenId}`);

        const seatsToCreate = [];
        const seatIdsToKeep = new Set<number>();
        let updatedCount = 0;

        // 2. Iterate through new layout
        for (let r = 0; r < rows; r++) {
            const rowLabel = characters[r];
            for (let c = 1; c <= cols; c++) {
                const key = `${rowLabel}-${c}`;
                const existingSeat = existingSeatMap.get(key);

                if (existingSeat) {
                    // Update existing seat if needed (e.g. price change)
                    // We preserve the ID, so all bookings stay valid!
                    updatedCount++;
                    existingSeat.price = price || 150.00;
                    existingSeat.type = 'Regular'; // Reset to regular or keep? Assuming reset for generated layout
                    await existingSeat.save();
                    seatIdsToKeep.add(existingSeat.id);
                } else {
                    // Start collecting new seats to bulk create
                    seatsToCreate.push({
                        screenId,
                        row: rowLabel,
                        number: c,
                        type: 'Regular',
                        price: price || 150.00,
                        status: 'available',
                    });
                }
            }
        }

        // 3. Create new seats
        if (seatsToCreate.length > 0) {
            await Seat.bulkCreate(seatsToCreate);
        }

        // 4. Handle seats that are no longer in the layout
        const seatsToRemove = existingSeats.filter(s => !seatIdsToKeep.has(s.id));

        let removedCount = 0;
        for (const seat of seatsToRemove) {
            // Check if this seat has any future/active bookings
            // For strict safety, we could check DB.
            // If we just delete, and it has bookings, the DB constraints might error or cascade.
            // Let's try to delete. If it fails due to FK, we catch it or we can manually check.
            // Better UX: Only delete if no associated tickets.

            const ticketCount = await Ticket.count({ where: { seatId: seat.id } });
            if (ticketCount === 0) {
                await seat.destroy();
                removedCount++;
            } else {
                console.warn(`Skipping deletion of Seat ${seat.row}${seat.number} (ID: ${seat.id}) because it has active tickets.`);
                // We keep the seat even if it's "invisible" in the new grid?? 
                // Or maybe we should allow it to be deleted and cascade? 
                // User requirement: "rearrange booked seat".
                // Since this logic MAPPED the seats by Row/Col, if the user shrank the grid, 
                // e.g. Row 'F' is gone. If 'F5' had a booking, we are here.
                // We can't "rearrange" it automatically because we don't know where to put it.
                // Safest bet: Don't delete it, so the record exists, even if UI doesn't render it in the new grid.
                // Or allows Admin to see "Ghost" seats?
            }
        }

        console.log(`Update complete: Kept/Updated ${seatIdsToKeep.size}, Created ${seatsToCreate.length}, Removed ${removedCount}, Skipped ${seatsToRemove.length - removedCount}`);

        res.status(201).json({
            message: `Layout updated successfully.`,
            stats: {
                kept: seatIdsToKeep.size,
                created: seatsToCreate.length,
                removed: removedCount,
                updated: updatedCount,
                skippedDeletion: seatsToRemove.length - removedCount
            }
        });
    } catch (error) {
        console.error('Error generating seats:', error);
        res.status(500).json({ message: 'Error generating seats', error });
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
        const showtimes = await Showtime.findAll({
            include: [
                { model: Movie },
                {
                    model: Screen,
                    include: [Theater]
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
    try {
        const { id } = req.params;
        const showtime = await Showtime.findByPk(parseInt(String(id)));

        if (!showtime) {
            res.status(404).json({ message: 'Showtime not found' });
            return;
        }

        // Manual cascade delete: delete associated bookings first
        await Booking.destroy({ where: { showtimeId: showtime.id } });

        await showtime.destroy();
        res.json({ message: 'Showtime deleted successfully' });
    } catch (error) {
        console.error('Error deleting showtime:', error);
        res.status(500).json({ message: 'Error deleting showtime', error });
    }
};

export const getAllBookings = async (req: Request, res: Response): Promise<void> => {
    try {
        const bookings = await Booking.findAll({
            include: [
                { model: User, attributes: ['id', 'name', 'email'] },
                {
                    model: Showtime,
                    include: [
                        { model: Movie, attributes: ['title'] },
                        { model: Screen, attributes: ['name'], include: [{ model: Theater, attributes: ['name'] }] }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Error fetching bookings', error });
    }
};

export const deleteBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const booking = await Booking.findByPk(parseInt(String(id)));

        if (!booking) {
            res.status(404).json({ message: 'Booking not found' });
            return;
        }

        // Delete associated tickets first
        await Ticket.destroy({ where: { bookingId: booking.id } });

        await booking.destroy();
        res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ message: 'Error deleting booking', error });
    }
};
