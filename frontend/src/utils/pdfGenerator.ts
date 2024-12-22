import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { OrderData } from '../types/order';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generateOrderPDF = async (orderData: OrderData) => {
  try {
    // Create new PDF
    const doc = new jsPDF();
    
    // Add letterhead as image (use PNG/JPEG format instead of PDF)
    const response = await fetch('/templates/letterhead.png'); // Change file extension
    if (!response.ok) {
      console.error('Failed to load letterhead:', response.statusText);
      throw new Error(`Failed to load letterhead: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const reader = new FileReader();
    
    // Convert blob to base64
    const base64 = await new Promise<string>((resolve) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    
    // Add the letterhead as an image
    doc.addImage(
      base64,
      'PNG', // Change format to PNG
      0, 0,
      doc.internal.pageSize.getWidth(),
      doc.internal.pageSize.getHeight(),
      undefined,
      'FAST'
    );
    
    // Rest of your content remains the same...
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
        halign: 'left'
      },
      bodyStyles: {
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 40, halign: 'left' },
        1: { cellWidth: 100, halign: 'left' },
        2: { cellWidth: 30, halign: 'right' }
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