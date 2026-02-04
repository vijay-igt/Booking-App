import bcrypt from 'bcryptjs';
import { sequelize } from './config/database';
import { User } from './models/User';
import dotenv from 'dotenv';

dotenv.config();

const seedAdmin = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ where: { email: 'admin@cinema.com' } });
        if (existingAdmin) {
            console.log('Admin user already exists.');
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('admin123', salt);

        await User.create({
            name: 'Administrator',
            email: 'admin@cinema.com',
            passwordHash,
            role: 'admin',
        });

        console.log('Admin user created successfully.');
        console.log('Email: admin@cinema.com');
        console.log('Password: admin123');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
