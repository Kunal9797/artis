import { Router, Request, Response } from 'express';
import { Contact } from '../models';
import { ContactStatus } from '../models/Contact';

const router = Router();

/**
 * Webhook endpoint for Wix form submissions
 * This endpoint will be called when a new form is submitted
 */
router.post('/wix-form', async (req: Request, res: Response) => {
  try {
    console.log('Received Wix webhook:', JSON.stringify(req.body, null, 2));
    
    // Extract the actual data from the nested structure
    const webhookData = req.body.data || req.body;
    
    // Extract form data from the Wix webhook payload
    const {
      submissionTime,
      submissionId,
      formName,
      contactId,
      contact,
      submissions,
      // Wix sends field data with "field:" prefix
      'field:full_name': fullName,
      'field:phone_6a9f': phone,
      'field:address_7898': address,
      'field:interested_in': interestedIn,
      'field:message': message
    } = webhookData;
    
    // Extract phone from contact object if available (more reliable)
    const finalPhone = phone || contact?.phone || contact?.phones?.[0]?.e164Phone;
    const finalAddress = address || contact?.address?.formattedAddress || contact?.addresses?.[0]?.address?.formattedAddress;
    
    // Validate required fields
    if (!fullName || !finalPhone) {
      console.error('Missing required fields. Received:', {
        fullName,
        finalPhone,
        address: finalAddress,
        interestedIn,
        message,
        rawPhone: phone,
        contactPhone: contact?.phone
      });
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: name and phone' 
      });
    }
    
    // Check if contact already exists (to prevent duplicates)
    const existingContact = await Contact.findOne({
      where: {
        phone: finalPhone,
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
    
    // Store additional metadata
    const metadata = {
      wixContactId: contactId || contact?.contactId,
      submissionId: submissionId,
      activationId: webhookData._context?.activation?.id,
      configurationId: webhookData._context?.configuration?.id,
      appId: webhookData._context?.app?.id,
      actionId: webhookData._context?.action?.id,
      triggerKey: webhookData._context?.trigger?.key,
      contactCreatedDate: contact?.createdDate,
      contactUpdatedDate: contact?.updatedDate,
      submissionsLink: webhookData.submissionsLink
    };
    
    // Create the contact in the database with all captured data
    const newContact = await Contact.create({
      submissionTime: submissionTime || new Date(),
      name: fullName,
      phone: finalPhone,
      interestedIn: interestedIn || '',
      address: finalAddress || '',
      query: message || '',
      source: 'wix_webhook',
      status: ContactStatus.NEW,
      isNew: true,
      externalId: submissionId || contactId,
      formId: webhookData.formId,
      formName: formName || 'Unknown Form',
      metaSiteId: webhookData.context?.metaSiteId || webhookData._context?.metaSiteId,
      phoneCountryCode: contact?.phones?.[0]?.countryCode,
      formattedPhone: contact?.phones?.[0]?.formattedPhone || phone,
      metadata: metadata
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