
import { sequelize } from './config/database';
import { Wallet } from './models/Wallet';
import { Transaction } from './models/Transaction';
import { User } from './models/User';
import { Movie } from './models/Movie';
import { Theater } from './models/Theater';

const inspect = async () => {
    try {
        await sequelize.authenticate();
        console.log('DB Connected');

        const wallets = await Wallet.findAll();
        console.log('--- WALLETS ---');
        wallets.forEach(w => console.log(JSON.stringify(w.toJSON())));

        const transactions = await Transaction.findAll({ limit: 20, order: [['createdAt', 'DESC']] });
        console.log('--- RECENT TRANSACTIONS ---');
        transactions.forEach(t => console.log(JSON.stringify(t.toJSON())));

        const users = await User.findAll({ where: { role: 'super_admin' } });
        console.log('--- SUPER ADMINS ---');
        users.forEach(u => console.log(JSON.stringify(u.toJSON())));

        const movies = await Movie.findAll({ limit: 5 });
        console.log('--- MOVIES ---');
        movies.forEach(m => console.log(JSON.stringify(m.toJSON())));

        const theaters = await Theater.findAll({ limit: 5 });
        console.log('--- THEATERS ---');
        theaters.forEach(t => console.log(JSON.stringify(t.toJSON())));

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
};

inspect();
