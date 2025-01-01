import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { OrderData } from '../types/order';
import letterheadBase64 from '../assets/letterhead';


declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generateOrderPDF = async (orderData: OrderData) => {
  try {
    console.log('Starting PDF generation...');
    const doc = new jsPDF();
    
    // Base64 encoded letterhead image    
    // Add the letterhead directly from base64
    doc.addImage(
      letterheadBase64,
      'PNG',
      0, 0,
      doc.internal.pageSize.getWidth(),
      doc.internal.pageSize.getHeight(),
      undefined,
      'FAST'
    );
    
    // Rest of your PDF generation code remains the same
    doc.setFontSize(11);
    doc.setTextColor(43, 42, 41);
    
    // Continue with existing code...
    doc.text(`Date: ${orderData.date.toLocaleDateString()}`, 20, 65);
    doc.text(`To: ${orderData.supplier}`, 20, 75);
    
    // Rest of your content remains the same...
    doc.setFontSize(12);
    doc.text('Subject: Design Paper Order', 20, 95);
    doc.setFontSize(11);
    doc.text('Dear Sir/Madam,', 20, 115);
    doc.text('Please arrange to supply the following design papers:', 20, 125);
    
    const tableData = orderData.items.map(item => [
      item.product.supplierCode || '',
      item.product.name,
      `${item.quantity} kg`
    ]);
    
    doc.autoTable({
      startY: 140,
      head: [['Design Code', 'Design Name', 'Quantity']],
      body: tableData,
      headStyles: { 
        fillColor: [43, 42, 41],
        textColor: 255,
        fontSize: 11,
        halign: 'center',
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 10,
        halign: 'center'
      },
      columnStyles: {
        0: { 
          cellWidth: 40, 
          fontStyle: 'bold'  // Bold design code
        },
        1: { 
          cellWidth: 100
        },
        2: { 
          cellWidth: 30
        }
      },
      margin: { top: 30, right: 20, bottom: 50, left: 20 },
      theme: 'grid'
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    if (finalY < 700) {
      doc.text('Thank you for your cooperation.', 20, finalY);
      doc.text('Best regards,', 20, finalY + 20);
      doc.text('Artis Laminate', 20, finalY + 40);
    }
    
    // Save the PDF with a specific filename
    const filename = `Design_Paper_Order_${orderData.date.toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    console.log('PDF saved successfully');
    
  } catch (error) {
    console.error('Error in PDF generation:', error);
    throw error;
  }
}; 
export const generateCustomLetterPDF = async ({ 
  subject, 
  recipient,
  content, 
  closingRemarks,
  date,
  fontSize = 11,
  fontStyle = 'normal',
  font = 'helvetica'
}: {
  subject: string;
  recipient: string;
  content: string;
  closingRemarks: string;
  date: Date;
  fontSize?: number;
  fontStyle?: string;
  font?: string;
}) => {
  try {
    const doc = new jsPDF();
    
    // Add the letterhead
    doc.addImage(
      letterheadBase64,
      'PNG',
      0, 0,
      doc.internal.pageSize.getWidth(),
      doc.internal.pageSize.getHeight(),
      undefined,
      'FAST'
    );
    
    // Set text properties
    doc.setFontSize(fontSize);
    doc.setTextColor(43, 42, 41);
    
    // Add date
  

    // Set font and style
switch (font) {
  case 'times':
    doc.setFont('times', fontStyle);
    break;
  case 'courier':
    doc.setFont('courier', fontStyle);
    break;
  case 'georgia':
    doc.setFont('georgia', fontStyle);
    break;
  case 'arial':
    doc.setFont('arial', fontStyle);
    break;
  case 'verdana':
    doc.setFont('verdana', fontStyle);
    break;
  case 'trebuchet':
    doc.setFont('trebuchet', fontStyle);
    break;
  case 'cambria':
    doc.setFont('cambria', fontStyle);
    break;
  default:
    doc.setFont('helvetica', fontStyle);
}
    // Set font and style

    // Format date as dd/mm/yyyy
    const formattedDate = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    doc.text(`Date: ${formattedDate}`, 20, 65);
    // Add recipient if provided
    if (recipient) {
      doc.text(recipient, 20, 85);
      doc.text(`Subject: ${subject}`, 20, 105);
      const splitContent = doc.splitTextToSize(content, 170);
      doc.text(splitContent, 20, 125);
    } else {
      doc.text(`Subject: ${subject}`, 20, 85);
      const splitContent = doc.splitTextToSize(content, 170);
      doc.text(splitContent, 20, 105);
    }
    
    // Add closing remarks with tighter positioning
    const contentLines = doc.splitTextToSize(content, 170).length;
    const startY = recipient ? 125 : 105;
    const closingY = startY + (contentLines * 7) + 5; // Reduced from 10 to 5 for even tighter spacing
    
    const closingLines = doc.splitTextToSize(closingRemarks, 170);
    doc.text(closingLines, 20, closingY);
    
    // Save the PDF
    const filename = `Artis_Letter_${date.toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    
  } catch (error) {
    console.error('Error in PDF generation:', error);
    throw error;
  }
};