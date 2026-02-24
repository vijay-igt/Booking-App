import { sequelize } from '../config/database';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import { Booking } from '../models/Booking';
import { Ticket } from '../models/Ticket';
import { User } from '../models/User';
import { Coupon } from '../models/Coupon';
import { CouponUsage } from '../models/CouponUsage';
import { Notification } from '../models/Notification';
import { WalletRequest } from '../models/WalletRequest';
const clearData = async () => {
    try {
        await sequelize.sync(); // Ensure tables are created if they don't exist

        console.log('Clearing Ticket data...');
        await Ticket.destroy({ truncate: true, cascade: true });

        console.log('Clearing Booking data...');
        await Booking.destroy({ truncate: true, cascade: true });

        console.log('Clearing Transaction data...');
        await Transaction.destroy({ truncate: true, cascade: true });

        console.log('Clearing Wallet data...');
        await Wallet.destroy({ truncate: true, cascade: true });

        console.log('Clearing WalletRequest data...');
        await WalletRequest.destroy({ truncate: true, cascade: true });

        console.log('Clearing CouponUsage data...');
        await CouponUsage.destroy({ truncate: true, cascade: true });

        console.log('Clearing Coupon data...');
        await Coupon.destroy({ truncate: true, cascade: true });

        console.log('Clearing Notification data...');
        await Notification.destroy({ truncate: true, cascade: true });

        // Reset walletBalance for all users to 0
        console.log('Resetting User wallet balances...');
        await User.update({ walletBalance: 0 }, { where: {} });

        console.log('Data cleared successfully!');
    } catch (error) {
        console.error('Error clearing data:', error);
    } finally {
        await sequelize.close();
    }
};

clearData();
