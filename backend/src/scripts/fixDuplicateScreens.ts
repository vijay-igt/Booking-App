import { sequelize } from '../config/database';

async function fixDuplicateScreens() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();

        console.log('Removing duplicate screen names...');

        // Delete duplicate screens, keeping only the first one for each theater+name combination
        await sequelize.query(`
            DELETE FROM screens
            WHERE id NOT IN (
                SELECT MIN(id)
                FROM screens
                GROUP BY "theaterId", name
            );
        `);

        console.log('Duplicate screens removed successfully!');
        console.log('You can now restart the server.');

        process.exit(0);
    } catch (error) {
        console.error('Error fixing duplicates:', error);
        process.exit(1);
    }
}

fixDuplicateScreens();
