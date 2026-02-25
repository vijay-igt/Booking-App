import { sequelize } from './src/config/database';

async function fixConstraints() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        console.log('Attempting to drop constraint manually...');
        try {
            await sequelize.query('ALTER TABLE "theaters" DROP CONSTRAINT IF EXISTS "theaters_ownerId_fkey"');
            console.log('Constraint dropped (or did not exist).');
        } catch (e) {
            console.error('Failed to drop constraint:', e);
        }

        console.log('Current state of theaters table:');
        const [results] = await sequelize.query(`
            SELECT conname, contype 
            FROM pg_constraint 
            JOIN pg_class ON pg_class.oid = pg_constraint.conrelid 
            WHERE relname = 'theaters';
        `);
        console.log(JSON.stringify(results, null, 2));

    } catch (error) {
        console.error('Error fixing constraints:', error);
    } finally {
        await sequelize.close();
    }
}

fixConstraints();
