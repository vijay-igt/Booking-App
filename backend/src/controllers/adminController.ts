import { Request, Response } from 'express';
import { Theater } from '../models/Theater';
import { Screen } from '../models/Screen';
import { Seat } from '../models/Seat';
import { Showtime } from '../models/Showtime';
import { Movie } from '../models/Movie';

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
        const screen = await Screen.create({ theaterId, name });
        res.status(201).json(screen);
    } catch (error) {
        res.status(500).json({ message: 'Error creating screen', error });
    }
};

export const generateSeats = async (req: Request, res: Response): Promise<void> => {
    try {
        const { screenId, rows, cols, price } = req.body;

        const seats = [];
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

        for (let r = 0; r < rows; r++) {
            const rowLabel = characters[r];
            for (let c = 1; c <= cols; c++) {
                seats.push({
                    screenId,
                    row: rowLabel,
                    number: c,
                    type: 'Regular',
                    price: price || 10.00,
                    status: 'available',
                });
            }
        }

        await Seat.bulkCreate(seats);
        res.status(201).json({ message: `${seats.length} seats generated successfully` });
    } catch (error) {
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
