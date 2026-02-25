import { sequelize } from './src/config/database';

async function checkConstraints() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        const [results] = await sequelize.query(`
            SELECT conname, contype 
            FROM pg_constraint 
            JOIN pg_class ON pg_class.oid = pg_constraint.conrelid 
            WHERE relname = 'theaters';
        `);

        console.log('Constraints on theaters table:');
        console.log(JSON.stringify(results, null, 2));

        const [columns] = await sequelize.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'theaters';
        `);
        console.log('Columns on theaters table:');
        console.log(JSON.stringify(columns, null, 2));

    } catch (error) {
        console.error('Error checking constraints:', error);
    } finally {
        await sequelize.close();
    }
}

checkConstraints();
