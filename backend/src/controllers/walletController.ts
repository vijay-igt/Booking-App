import { Request, Response } from 'express';
import { User } from '../models/User';
import { WalletRequest } from '../models/WalletRequest';
import { Transaction } from '../models/Transaction';
import { sequelize } from '../config/database';
import { getProducer } from '../utils/kafka';

export const getBalance = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const transactions = await Transaction.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            limit: 20
        });

        const pendingRequests = await WalletRequest.findAll({
            where: { userId, status: 'PENDING' },
            order: [['createdAt', 'DESC']]
        });

        res.json({
            balance: user.walletBalance,
            transactions,
            pendingRequests
        });
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ message: 'Error fetching wallet balance' });
    }
};

export const requestTopUp = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { amount, paymentMethod } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const transactionRef = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const request = await WalletRequest.create({
            userId,
            amount,
            paymentMethod,
            transactionRef,
            status: 'PENDING'
        });

        const producer = await getProducer();
        if (producer) {
            await producer.send({
                topic: 'wallet-updates',
                messages: [{
                    value: JSON.stringify({
                        type: 'TOPUP_REQUESTED',
                        userId: request.userId,
                        requestId: request.id,
                        amount: request.amount,
                        paymentMethod: request.paymentMethod,
                        status: request.status,
                        timestamp: new Date().toISOString()
                    })
                }]
            });
        } else {
            console.warn('Kafka producer not available. Wallet top-up request not published to Kafka.');
        }

        res.status(201).json(request);
    } catch (error) {
        console.error('Request top-up error:', error);
        res.status(500).json({ message: 'Error creating top-up request' });
    }
};

export const getPendingRequests = async (req: Request, res: Response) => {
    try {
        const requests = await WalletRequest.findAll({
            where: { status: 'PENDING' },
            include: [{ model: User, attributes: ['id', 'name', 'email'] }],
            order: [['createdAt', 'ASC']]
        });
        res.json(requests);
    } catch (error) {
        console.error('Get pending requests error:', error);
        res.status(500).json({ message: 'Error fetching requests' });
    }
};

export const approveRequest = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { requestId } = req.params;
        const request = await WalletRequest.findByPk(requestId, { transaction: t });

        if (!request || request.status !== 'PENDING') {
            await t.rollback();
            return res.status(400).json({ message: 'Invalid request or already processed' });
        }

        // 1. Update Request Status
        request.status = 'APPROVED';
        await request.save({ transaction: t });

        // 2. Update User Balance
        const user = await User.findByPk(request.userId, { transaction: t });
        if (!user) throw new Error('User not found');

        // Ensure walletBalance is treated as number 
        // Sequelize DECIMAL types are returned as strings in JS sometimes, but we updated model to number type.
        // Safer to parse float.
        const currentBalance = parseFloat(user.walletBalance as any);
        const amountToAdd = parseFloat(request.amount as any);

        user.walletBalance = currentBalance + amountToAdd;
        await user.save({ transaction: t });

        // 3. Create Transaction Record
        await Transaction.create({
            userId: user.id,
            walletRequestId: request.id,
            amount: request.amount,
            type: 'CREDIT',
            description: `Top-up: ${request.paymentMethod} (${request.transactionRef})`
        }, { transaction: t });

        await t.commit();

        const producer = await getProducer();
        if (producer) {
            await producer.send({ topic: 'wallet-updates', messages: [{ value: JSON.stringify({ type: 'TOPUP_APPROVED', userId: request.userId, requestId: request.id, amount: request.amount, newBalance: user.walletBalance, timestamp: new Date().toISOString() }) }] });
        } else {
            console.warn('Kafka producer not available. Wallet top-up approval not published to Kafka.');
        }

        res.json({ message: 'Top-up approved successfully', newBalance: user.walletBalance });
    } catch (error) {
        await t.rollback();
        console.error('Approve request error:', error);
        res.status(500).json({ message: 'Error approving request' });
    }
};

export const rejectRequest = async (req: Request, res: Response) => {
    try {
        const { requestId } = req.params;
        const request = await WalletRequest.findByPk(requestId);

        if (!request || request.status !== 'PENDING') {
            return res.status(400).json({ message: 'Invalid request or already processed' });
        }

        request.status = 'REJECTED';
        await request.save();

        const producer = await getProducer();
        if (producer) {
            await producer.send({
                topic: 'wallet-updates',
                messages: [{
                    value: JSON.stringify({
                        type: 'TOPUP_REJECTED',
                        userId: request.userId,
                        requestId: request.id,
                        reason: 'Rejected by admin',
                        timestamp: new Date().toISOString()
                    })
                }]
            });
        } else {
            console.warn('Kafka producer not available. Wallet top-up rejection not published to Kafka.');
        }

        res.json({ message: 'Top-up request rejected' });
    } catch (error) {
        console.error('Reject request error:', error);
        res.status(500).json({ message: 'Error rejecting request' });
    }
};

export const getUsersWithBalance = async (req: Request, res: Response) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'walletBalance', 'role'],
            where: { role: 'user' },
            order: [['name', 'ASC']]
        });
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
};

// Admin Manual Top-up (Directly add funds without request)
export const directTopUp = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { userId, amount, description } = req.body;

        if (!amount || amount <= 0) {
            await t.rollback();
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const user = await User.findByPk(userId, { transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ message: 'User not found' });
        }

        const currentBalance = parseFloat(user.walletBalance as any);
        user.walletBalance = currentBalance + parseFloat(amount);
        await user.save({ transaction: t });

        await Transaction.create({
            userId: user.id,
            amount: amount,
            type: 'CREDIT',
            description: description || 'Admin Manual Top-up'
        }, { transaction: t });

        await t.commit();
        res.json({ message: 'Funds added successfully', newBalance: user.walletBalance });

    } catch (error) {
        await t.rollback();
        console.error('Direct top-up error:', error);
        res.status(500).json({ message: 'Error adding funds' });
    }
}
