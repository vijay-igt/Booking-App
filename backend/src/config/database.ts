import { Sequelize } from 'sequelize-typescript';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Theater } from '../models/Theater';
import { Screen } from '../models/Screen';
import { Seat } from '../models/Seat';
import { Booking } from '../models/Booking';
import { Movie } from '../models/Movie';
import { Showtime } from '../models/Showtime';
import { Ticket } from '../models/Ticket';

dotenv.config();

export const sequelize = new Sequelize({
    database: process.env.DB_NAME || 'movie_booking_db',
    dialect: 'postgres',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    models: [User, Theater, Screen, Seat, Booking, Movie, Showtime, Ticket], // We will add more models here
    logging: false,
});
