import { sequelize } from './config/database';

const resetDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Force sync to drop tables and recreate them
        await sequelize.sync({ force: true });
        console.log('Database reset successfully. Schema is now up to date.');

        process.exit(0);
    } catch (error) {
        console.error('Error resetting database:', error);
        process.exit(1);
    }
};

resetDatabase();
