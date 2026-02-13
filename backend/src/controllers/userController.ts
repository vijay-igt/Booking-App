import { Request, Response } from 'express';
import { User } from '../models/User';

export const requestOwnerStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const user = await User.findByPk(userId);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (user.role === 'admin' || user.role === 'super_admin') {
            res.status(400).json({ message: 'You are already an admin or super admin.' });
            return;
        }

        if (user.adminRequestStatus === 'PENDING') {
            res.status(400).json({ message: 'You already have a pending request.' });
            return;
        }

        if (user.adminRequestStatus === 'APPROVED') {
            res.status(400).json({ message: 'Your request has already been approved.' });
            return;
        }

        user.adminRequestStatus = 'PENDING';
        await user.save();

        res.json({ message: 'Request submitted successfully. Please wait for Super Admin approval.', user });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting request', error });
    }
};
