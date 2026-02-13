import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import { getProducer } from '../config/kafkaClient';

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

        // Generate Verification Token
        const crypto = require('crypto');
        const verificationToken = crypto.randomBytes(32).toString('hex');

        const newUser = await User.create({
            name,
            email,
            passwordHash,
            role: role || 'user',
            emailVerificationToken: verificationToken,
            emailVerificationExpires: new Date(Date.now() + 24 * 3600000), // 24 hours
        });

        // Create a wallet for the new user
        await Wallet.create({
            userId: newUser.id,
            type: 'user',
            balance: 0
        });
        console.log(`Wallet created for new user: ${newUser.id}`);

        // Emit Kafka Event for Email Verification
        try {
            const producer = await getProducer();
            if (producer) {
                await producer.send({
                    topic: 'auth-events',
                    messages: [{
                        value: JSON.stringify({
                            userId: newUser.id,
                            email: newUser.email,
                            type: 'USER_REGISTERED',
                            token: verificationToken,
                            verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
                        })
                    }]
                });
            }
        } catch (kafkaError) {
            console.error('[Register] Kafka error:', kafkaError);
        }

        console.log('User registered successfully (unverified):', newUser.id);
        res.status(201).json({
            message: 'Registration successful! Please check your email to verify your account.',
            userId: newUser.id
        });
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

        const token = jwt.sign({ id: user.id, role: user.role, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '1d' });

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

        let walletBalance = '0.00';
        const wallet = await Wallet.findOne({ where: { userId: user.id, type: user.role === 'user' ? 'user' : 'owner' } });
        if (wallet) {
            walletBalance = Number(wallet.balance).toFixed(2);
        }

        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, walletBalance, isEmailVerified: user.isEmailVerified } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.query;

    if (!token) {
        res.status(400).json({ message: 'Verification token is required' });
        return;
    }

    try {
        const user = await User.findOne({
            where: {
                emailVerificationToken: token,
                emailVerificationExpires: { [require('sequelize').Op.gt]: new Date() }
            }
        });

        if (!user) {
            res.status(400).json({ message: 'Invalid or expired verification token' });
            return;
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        res.json({ message: 'Email verified successfully! You can now access all features.' });
    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const resendVerification = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ where: { email, isEmailVerified: false } });
        if (!user) {
            res.status(400).json({ message: 'Account not found or already verified' });
            return;
        }

        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        
        user.emailVerificationToken = token;
        user.emailVerificationExpires = new Date(Date.now() + 24 * 3600000);
        await user.save();

        try {
            const producer = await getProducer();
            if (producer) {
                await producer.send({
                    topic: 'auth-events',
                    messages: [{
                        value: JSON.stringify({
                            userId: user.id,
                            email: user.email,
                            type: 'USER_REGISTERED',
                            token,
                            verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${token}`
                        })
                    }]
                });
            }
        } catch (kafkaError) {
            console.error('[ResendVerify] Kafka error:', kafkaError);
        }

        res.json({ message: 'Verification email sent successfully.' });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
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

export const getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id, {
            attributes: ['id', 'name', 'email', 'role', 'walletBalance'] // Exclude sensitive fields
        });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.json(user);
    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const user = await User.findByPk(userId, {
            attributes: ['id', 'name', 'email', 'role', 'walletBalance', 'commissionRate', 'googleId']
        });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.json(user);
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            // Don't reveal if user exists for security
            res.json({ message: 'If an account with that email exists, we have sent a reset link.' });
            return;
        }

        // Generate Token
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');

        // Save to DB (1 hour expiry)
        user.passwordResetToken = token;
        user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
        await user.save();

        // 3. Emit Kafka Event for Email
        try {
            const producer = await getProducer();
            if (producer) {
                await producer.send({
                    topic: 'auth-events',
                    messages: [{
                        value: JSON.stringify({
                            userId: user.id,
                            email: user.email,
                            type: 'PASSWORD_RESET_REQUESTED',
                            token,
                            resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${token}`
                        })
                    }]
                });
            }
        } catch (kafkaError) {
            console.error('[ForgotPwd] Kafka error:', kafkaError);
        }

        res.json({ message: 'If an account with that email exists, we have sent a reset link.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { token, password } = req.body;

    try {
        const user = await User.findOne({
            where: {
                passwordResetToken: token,
                passwordResetExpires: { [require('sequelize').Op.gt]: new Date() }
            }
        });

        if (!user) {
            res.status(400).json({ message: 'Invalid or expired reset token' });
            return;
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(password, salt);
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        res.json({ message: 'Password has been reset successfully. You can now login.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
