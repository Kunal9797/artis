import { Contact } from '../types/contact';
import { format } from 'date-fns';

export const copyLeadToClipboard = async (lead: Contact): Promise<boolean> => {
  const parts = [
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`
  ];

  if (lead.interestedIn) {
    parts.push(`Interest: ${lead.interestedIn}`);
  }

  if (lead.address) {
    parts.push(`Address: ${lead.address}`);
  }

  if (lead.query) {
    parts.push(`Query: ${lead.query}`);
  }

  parts.push(`Submitted: ${format(new Date(lead.submissionTime), 'MMM dd, yyyy h:mm a')}`);

  const formattedText = parts.join('\n');

  try {
    await navigator.clipboard.writeText(formattedText);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = formattedText;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (e) {
      document.body.removeChild(textArea);
      return false;
    }
  }
};