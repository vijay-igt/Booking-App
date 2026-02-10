import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { getProducer } from '../utils/kafka';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export const register = async (req: Request, res: Response): Promise<void> => {
    const { name, email, password, role } = req.body;

    try {
        console.log('Register request:', { name, email, role });
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            console.log('User already exists:', email);
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            name,
            email,
            passwordHash,
            role: role || 'user',
        });

        console.log('User registered successfully:', newUser.id);
        res.status(201).json({ message: 'User created successfully', userId: newUser.id });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    try {
        console.log('Login request:', { email });
        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log('User not found:', email);
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            console.log('Password mismatch for:', email);
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

        // Produce login event
        try {
            const producer = await getProducer();
            if (producer) {
                await producer.send({
                    topic: 'user-activity',
                    messages: [{
                        value: JSON.stringify({
                            userId: user.id,
                            email: user.email,
                            type: 'USER_LOGIN',
                            timestamp: new Date().toISOString()
                        })
                    }]
                });
            }
        } catch (eventError) {
            console.error('Failed to publish login event:', eventError);
        }

        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;
        const { name, email } = req.body;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const user = await User.findByPk(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        await user.update({ name, email });

        // Trigger info notification
        const { Notification } = require('../models/Notification');
        await Notification.create({
            userId: user.id,
            title: 'Profile Updated',
            message: `Hi ${user.name}, your profile details have been successfully updated.`,
            type: 'info',
            isRead: false
        });

        res.json({ message: 'Profile updated successfully', user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
};
