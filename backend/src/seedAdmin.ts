import bcrypt from 'bcryptjs';
import { sequelize } from './config/database';
import { User } from './models/User';
import dotenv from 'dotenv';

dotenv.config();

export const seedAdmin = async () => {
    const name = "Admin User";
    const email = "admin@cinepass.com";
    const password = "adminpassword123";

    try {
        const existingAdmin = await User.findOne({ where: { email } });
        if (existingAdmin) {
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await User.create({
            name,
            email,
            passwordHash,
            role: 'admin'
        });

        console.log('Automated Admin Seeding: SUCCESS');
    } catch (error) {
        console.error('Error seeding admin:', error);
    }
};
