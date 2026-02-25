import { Router } from 'express';
import { supportController } from '../controllers/supportController';
import { authenticateToken, adminAuth, superAdminAuth } from '../middleware/auth';

const router = Router();

// User routes
/**
 * @openapi
 * /api/support/tickets:
 *   post:
 *     tags:
 *       - Support
 *     summary: Create a new support ticket
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - message
 *             properties:
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *               category:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *   get:
 *     tags:
 *       - Support
 *     summary: Get all support tickets for the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user tickets retrieved successfully
 */
router.post('/tickets', authenticateToken, supportController.createTicket);
router.get('/tickets', authenticateToken, supportController.getUserTickets);
/**
 * @openapi
 * /api/support/tickets/{id}:
 *   get:
 *     tags:
 *       - Support
 *     summary: Get support ticket details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ticket details retrieved successfully
 */
router.get('/tickets/:id', authenticateToken, supportController.getTicketDetails);

/**
 * @openapi
 * /api/support/tickets/{id}/replies:
 *   post:
 *     tags:
 *       - Support
 *     summary: Add a reply to a support ticket
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Reply added successfully
 */
router.post('/tickets/:id/replies', authenticateToken, supportController.addReply);

// Admin routes
/**
 * @openapi
 * /api/support/admin/tickets:
 *   get:
 *     tags:
 *       - Support
 *     summary: Get all support tickets (Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all tickets retrieved successfully
 */
router.get('/admin/tickets', adminAuth, supportController.adminGetAllTickets);

/**
 * @openapi
 * /api/support/admin/tickets/{id}/status:
 *   patch:
 *     tags:
 *       - Support
 *     summary: Update ticket status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [OPEN, IN_PROGRESS, CLOSED]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/admin/tickets/:id/status', adminAuth, supportController.updateTicketStatus);

/**
 * @openapi
 * /api/support/admin/tickets/{id}:
 *   delete:
 *     tags:
 *       - Support
 *     summary: Delete a ticket
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ticket deleted
 */
router.delete('/admin/tickets/:id', superAdminAuth, supportController.deleteTicket);
export default router;
