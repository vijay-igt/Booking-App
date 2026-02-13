import { sequelize } from '../config/database';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import { Booking } from '../models/Booking';
import { Ticket } from '../models/Ticket';
import { User } from '../models/User'; // To reset walletBalance in User model
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
