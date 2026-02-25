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
import { WalletRequest } from '../models/WalletRequest';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import { Notification } from '../models/Notification';
import { PushSubscription } from '../models/PushSubscription';
import { PricingRule } from '../models/PricingRule';
import { Coupon } from '../models/Coupon';
import { CouponUsage } from '../models/CouponUsage';
import { SupportTicket } from '../models/SupportTicket';
import { SupportTicketReply } from '../models/SupportTicketReply';
import { Watchlist } from '../models/Watchlist';
import { FoodItem } from '../models/FoodItem';
import { BookingFoodItem } from '../models/BookingFoodItem';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export const sequelize = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        models: [User, Theater, Screen, Seat, Booking, Movie, Showtime, Ticket, Notification, WalletRequest, Transaction, Wallet, PushSubscription, PricingRule, Coupon, CouponUsage, SupportTicket, SupportTicketReply, Watchlist, FoodItem, BookingFoodItem],
        logging: false,
        dialectOptions: isProduction ? {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        } : {}
    })
    : new Sequelize({
        database: process.env.DB_NAME || 'movie_booking_db',
        dialect: 'postgres',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        models: [User, Theater, Screen, Seat, Booking, Movie, Showtime, Ticket, Notification, WalletRequest, Transaction, Wallet, PushSubscription, PricingRule, Coupon, CouponUsage, SupportTicket, SupportTicketReply, Watchlist, FoodItem, BookingFoodItem],
        logging: false,
    });
