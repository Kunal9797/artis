import { Router, Request, Response } from 'express';
import { Contact, SalesTeam } from '../models';
import { auth } from '../middleware/auth';
import SheetsManagerOptimizedService from '../services/sheets-manager-optimized.service';
import { Op } from 'sequelize';

// Define AuthRequest interface to match the auth middleware
interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

const router = Router();
const sheetsManager = new SheetsManagerOptimizedService();

// Debug middleware
router.use((req, res, next) => {
  console.log('Contact route accessed:', req.method, req.path);
  next();
});

/**
 * @swagger
 * /api/contacts:
 *   get:
 *     summary: Get all contacts with pagination and filters
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [NEW, CONTACTED, QUALIFIED, CONVERTED, LOST]
 *       - in: query
 *         name: isNew
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of contacts
 */
router.get('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      isNew, 
      search 
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (isNew !== undefined) {
      where.isNew = isNew === 'true';
    }
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { interestedIn: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const { count, rows } = await Contact.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [['submissionTime', 'DESC']],
      include: [{
        model: SalesTeam,
        as: 'salesTeam',
        attributes: ['id', 'territory']
      }]
    });
    
    res.json({
      success: true,
      data: {
        contacts: rows,
        total: count,
        page: Number(page),
        pages: Math.ceil(count / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch contacts' 
    });
  }
});

/**
 * @swagger
 * /api/contacts/new-count:
 *   get:
 *     summary: Get count of new/unread contacts
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Count of new contacts
 */
router.get('/new-count', auth, async (req: AuthRequest, res: Response) => {
  try {
    const count = await Contact.count({
      where: { isNew: true }
    });
    
    res.json({
      success: true,
      count
    });
  } catch (error: any) {
    console.error('Error getting new contacts count:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get new contacts count' 
    });
  }
});

/**
 * @swagger
 * /api/contacts/latest:
 *   get:
 *     summary: Get latest contacts for home screen
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *     responses:
 *       200:
 *         description: Latest contacts
 */
router.get('/latest', auth, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 5;
    
    const contacts = await Contact.findAll({
      where: { isNew: true },
      limit,
      order: [['submissionTime', 'DESC']],
      attributes: ['id', 'name', 'phone', 'interestedIn', 'address', 'query', 'submissionTime', 'status', 'isNew']
    });
    
    res.json({
      success: true,
      data: contacts
    });
  } catch (error: any) {
    console.error('Error getting latest contacts:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get latest contacts' 
    });
  }
});

/**
 * @swagger
 * /api/contacts/{id}:
 *   get:
 *     summary: Get single contact details
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contact details
 */
router.get('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const contact = await Contact.findByPk(req.params.id, {
      include: [{
        model: SalesTeam,
        as: 'salesTeam'
      }]
    });
    
    if (!contact) {
      return res.status(404).json({ 
        success: false, 
        error: 'Contact not found' 
      });
    }
    
    // Automatically mark as read when viewed
    if (contact.isNew) {
      await contact.markAsRead();
    }
    
    res.json({
      success: true,
      data: contact
    });
  } catch (error: any) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch contact' 
    });
  }
});

/**
 * @swagger
 * /api/contacts/{id}:
 *   put:
 *     summary: Update contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               assignedTo:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated contact
 */
router.put('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    
    if (!contact) {
      return res.status(404).json({ 
        success: false, 
        error: 'Contact not found' 
      });
    }
    
    const { status, assignedTo, notes } = req.body;
    
    if (status) {
      await contact.updateStatus(status, notes);
    } else if (assignedTo) {
      await contact.assignToSalesTeam(assignedTo, notes);
    } else {
      await contact.update({ notes });
    }
    
    const updatedContact = await Contact.findByPk(req.params.id, {
      include: [{
        model: SalesTeam,
        as: 'salesTeam'
      }]
    });
    
    res.json({
      success: true,
      data: updatedContact
    });
  } catch (error: any) {
    console.error('Error updating contact:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update contact' 
    });
  }
});

/**
 * @swagger
 * /api/contacts/{id}/mark-read:
 *   post:
 *     summary: Mark contact as read
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contact marked as read
 */
router.post('/:id/mark-read', auth, async (req: AuthRequest, res: Response) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    
    if (!contact) {
      return res.status(404).json({ 
        success: false, 
        error: 'Contact not found' 
      });
    }
    
    await contact.markAsRead();
    
    res.json({
      success: true,
      message: 'Contact marked as read'
    });
  } catch (error: any) {
    console.error('Error marking contact as read:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to mark contact as read' 
    });
  }
});

/**
 * @swagger
 * /api/contacts/sync:
 *   post:
 *     summary: Sync contacts from Google Sheets
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync results
 */
router.post('/sync', auth, async (req: AuthRequest, res: Response) => {
  try {
    // Set user ID for tracking
    sheetsManager.setUserId(req.user?.id || '');
    
    const result = await sheetsManager.syncContacts();
    
    res.json({ 
      success: true, 
      message: `Synced ${result.added} new contacts`,
      ...result 
    });
  } catch (error: any) {
    console.error('Error syncing contacts:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to sync contacts' 
    });
  }
});

/**
 * @swagger
 * /api/contacts/mark-all-read:
 *   post:
 *     summary: Mark all contacts as read
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All contacts marked as read
 */
router.post('/mark-all-read', auth, async (req: AuthRequest, res: Response) => {
  try {
    const updated = await Contact.update(
      { isNew: false },
      { where: { isNew: true } }
    );
    
    res.json({
      success: true,
      message: `Marked ${updated[0]} contacts as read`
    });
  } catch (error: any) {
    console.error('Error marking all contacts as read:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to mark all contacts as read' 
    });
  }
});

export default router;