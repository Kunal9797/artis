import { Router, Request, Response } from 'express';
import { Contact } from '../models';

const router = Router();

/**
 * Webhook endpoint for Wix form submissions
 * This endpoint will be called when a new form is submitted
 */
router.post('/wix-form', async (req: Request, res: Response) => {
  try {
    console.log('Received Wix webhook:', JSON.stringify(req.body, null, 2));
    
    // Extract form data from the Wix webhook payload
    const {
      submissionTime,
      submissionId,
      formName,
      contactId,
      // Wix sends field data with "field:" prefix
      'field:full_name': fullName,
      'field:phone_6a9f': phone,
      'field:address_7898': address,
      'field:interested_in': interestedIn,
      'field:message': message
    } = req.body;
    
    // Validate required fields
    if (!fullName || !phone) {
      console.error('Missing required fields. Received:', {
        fullName,
        phone,
        address,
        interestedIn,
        message
      });
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: name and phone' 
      });
    }
    
    // Check if contact already exists (to prevent duplicates)
    const existingContact = await Contact.findOne({
      where: {
        phone: phone,
        name: fullName
      }
    });
    
    if (existingContact) {
      console.log('Contact already exists:', existingContact.id);
      return res.status(200).json({ 
        success: true, 
        message: 'Contact already exists',
        contactId: existingContact.id 
      });
    }
    
    // Create the contact in the database
    const newContact = await Contact.create({
      submissionTime: submissionTime || new Date(),
      name: fullName,
      phone: phone,
      interestedIn: interestedIn || '',
      address: address || '',
      query: message || '',
      source: 'wix_webhook',
      status: 'NEW',
      isNew: true,
      externalId: submissionId || contactId // Store Wix IDs for reference
    });
    
    console.log('Contact created from webhook:', {
      id: newContact.id,
      name: newContact.name,
      phone: newContact.phone
    });
    
    // Return success response
    res.status(200).json({ 
      success: true, 
      message: 'Contact received',
      contactId: newContact.id 
    });
    
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to process webhook' 
    });
  }
});

/**
 * Health check endpoint for webhook
 */
router.get('/wix-form/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    success: true, 
    message: 'Webhook endpoint is ready',
    timestamp: new Date().toISOString()
  });
});

export default router;