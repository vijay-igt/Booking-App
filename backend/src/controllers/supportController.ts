import { Request, Response } from 'express';
import { SupportTicket } from '../models/SupportTicket';
import { SupportTicketReply } from '../models/SupportTicketReply';
import { User } from '../models/User';
import { sendNotificationToUser, sendNotificationToAdmins, sendNotificationToSuperAdmins } from '../services/websocketService';

export const supportController = {
    /**
     * Create a new support ticket.
     */
    async createTicket(req: Request, res: Response) {
        try {
            const { subject, message, priority, category } = req.body;
            const userId = (req.user as any).id;

            const ticket = await SupportTicket.create({
                userId,
                subject,
                message,
                priority,
                category
            });

            res.status(201).json(ticket);
        } catch (error) {
            console.error('[SupportController] createTicket error:', error);
            res.status(500).json({ message: 'Error creating support ticket.' });
        }
    },

    /**
     * Get all tickets for the authenticated user.
     */
    async getUserTickets(req: Request, res: Response) {
        try {
            const userId = (req.user as any).id;
            const tickets = await SupportTicket.findAll({
                where: { userId },
                include: [{ model: SupportTicketReply, include: [{ model: User, attributes: ['id', 'name', 'role'] }] }],
                order: [['updatedAt', 'DESC']]
            });
            res.json(tickets);
        } catch (error) {
            console.error('[SupportController] getUserTickets error:', error);
            res.status(500).json({ message: 'Error fetching tickets.' });
        }
    },

    /**
     * Get a specific ticket with its replies.
     */
    async getTicketDetails(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = (req.user as any).id;
            const userRole = (req.user as any).role;

            const ticket = await SupportTicket.findByPk(id, {
                include: [
                    { model: SupportTicketReply, include: [{ model: User, attributes: ['id', 'name', 'role'] }] },
                    { model: User, attributes: ['id', 'name', 'email'] }
                ]
            });

            if (!ticket) {
                return res.status(404).json({ message: 'Ticket not found.' });
            }

            // Authorization check: User can only see their own tickets, Admins can see all.
            if (userRole !== 'admin' && userRole !== 'super_admin' && ticket.userId !== userId) {
                return res.status(403).json({ message: 'Unauthorized.' });
            }

            res.json(ticket);
        } catch (error) {
            console.error('[SupportController] getTicketDetails error:', error);
            res.status(500).json({ message: 'Error fetching ticket details.' });
        }
    },

    /**
     * Add a reply to a ticket.
     */
    async addReply(req: Request, res: Response) {
        try {
            const { id } = req.params; // ticketId
            const { message } = req.body;
            const senderId = (req.user as any).id;
            const userRole = (req.user as any).role;

            const ticket = await SupportTicket.findByPk(id);
            if (!ticket) {
                return res.status(404).json({ message: 'Ticket not found.' });
            }

            if (ticket.status === 'CLOSED') {
                return res.status(400).json({ message: 'Cannot reply to a closed ticket.' });
            }

            // Authorization check
            if (userRole !== 'admin' && userRole !== 'super_admin' && ticket.userId !== senderId) {
                return res.status(403).json({ message: 'Unauthorized.' });
            }

            const reply = await SupportTicketReply.create({
                ticketId: parseInt(id),
                senderId,
                message
            });

            // Update ticket updatedAt timestamp
            ticket.changed('updatedAt', true);
            await ticket.save();

            res.status(201).json(reply);

            // Emit WebSocket notification
            const replyWithSender = await SupportTicketReply.findByPk(reply.id, {
                include: [{ model: User, attributes: ['id', 'name', 'role'] }]
            });

            const notificationPayload = {
                type: 'SUPPORT_TICKET_REPLY',
                ticketId: ticket.id,
                reply: replyWithSender
            };

            if (userRole === 'admin' || userRole === 'super_admin') {
                // Admin replied -> Notify ticket owner
                sendNotificationToUser(ticket.userId, notificationPayload);
            } else {
                // User replied -> Notify admins & super admins
                sendNotificationToAdmins(notificationPayload);
                sendNotificationToSuperAdmins(notificationPayload);
            }
        } catch (error) {
            console.error('[SupportController] addReply error:', error);
            res.status(500).json({ message: 'Error adding reply.' });
        }
    },

    /**
     * Admin: Get all tickets.
     */
    async adminGetAllTickets(req: Request, res: Response) {
        try {
            const tickets = await SupportTicket.findAll({
                include: [
                    { model: User, attributes: ['id', 'name', 'email'] },
                    { model: SupportTicketReply, limit: 1, order: [['createdAt', 'DESC']] }
                ],
                order: [['updatedAt', 'DESC']]
            });
            res.json(tickets);
        } catch (error) {
            console.error('[SupportController] adminGetAllTickets error:', error);
            res.status(500).json({ message: 'Error fetching all tickets.' });
        }
    },

    /**
     * Admin: Update ticket status.
     */
    async updateTicketStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const ticket = await SupportTicket.findByPk(id);
            if (!ticket) {
                return res.status(404).json({ message: 'Ticket not found.' });
            }

            ticket.status = status;
            await ticket.save();

            const payload = {
                type: 'SUPPORT_TICKET_STATUS_UPDATE',
                ticketId: ticket.id,
                status: ticket.status,
            };

            sendNotificationToUser(ticket.userId, payload);
            sendNotificationToAdmins(payload);
            sendNotificationToSuperAdmins(payload);

            res.json(ticket);
        } catch (error) {
            console.error('[SupportController] updateTicketStatus error:', error);
            res.status(500).json({ message: 'Error updating ticket status.' });
        }
    },

    /**
     * Super Admin: Delete a ticket and its replies.
     */
    async deleteTicket(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const ticket = await SupportTicket.findByPk(id);
            if (!ticket) {
                return res.status(404).json({ message: 'Ticket not found.' });
            }

            await SupportTicketReply.destroy({ where: { ticketId: ticket.id } });
            await ticket.destroy();

            res.json({ message: 'Ticket deleted successfully.' });
        } catch (error) {
            console.error('[SupportController] deleteTicket error:', error);
            res.status(500).json({ message: 'Error deleting ticket.' });
        }
    }
};
