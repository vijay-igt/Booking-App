import bcrypt from 'bcryptjs';
import { sequelize } from './config/database';
import { User } from './models/User';
import { Wallet } from './models/Wallet';
import dotenv from 'dotenv';

dotenv.config();

export const seedAdmin = async () => {
    const name = "Admin (Vijay)";
    const email = "admin@cinepass.com";
    const password = "adminpassword123";

    try {
        const existingAdmin = await User.findOne({ where: { email } });
        if (existingAdmin) {
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const adminUser = await User.create({
            name,
            email,
            passwordHash,
            role: 'admin'
        });

        // Create an owner wallet for the admin
        await Wallet.create({
            userId: adminUser.id,
            type: 'owner',
            balance: 0
        });

        // Seed Super Admin
        const superEmail = "superadmin@cinepass.com";
        const superPassword = "superpassword123";
        
        const existingSuper = await User.findOne({ where: { email: superEmail } });
        if (!existingSuper) {
            const superHash = await bcrypt.hash(superPassword, salt);
            const superAdminUser = await User.create({
                name: "Super Administrator",
                email: superEmail,
                passwordHash: superHash,
                role: 'super_admin'
            });
            // Create a platform wallet for the super admin
            await Wallet.create({
                userId: superAdminUser.id,
                type: 'platform',
                balance: 0
            });
            console.log('Automated Super Admin Seeding: SUCCESS');
        }

        console.log('Automated Admin Seeding: SUCCESS');
    } catch (error) {
        console.error('Error seeding admin:', error);
    }
};
