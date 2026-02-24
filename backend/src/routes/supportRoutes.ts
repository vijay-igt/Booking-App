import { Router } from 'express';
import { supportController } from '../controllers/supportController';
import { authenticateToken, adminAuth, superAdminAuth } from '../middleware/auth';

const router = Router();

// User routes
router.post('/tickets', authenticateToken, supportController.createTicket);
router.get('/tickets', authenticateToken, supportController.getUserTickets);
router.get('/tickets/:id', authenticateToken, supportController.getTicketDetails);
router.post('/tickets/:id/replies', authenticateToken, supportController.addReply);

// Admin routes
router.get('/admin/tickets', adminAuth, supportController.adminGetAllTickets);
router.patch('/admin/tickets/:id/status', adminAuth, supportController.updateTicketStatus);
router.delete('/admin/tickets/:id', superAdminAuth, supportController.deleteTicket);

export default router;
