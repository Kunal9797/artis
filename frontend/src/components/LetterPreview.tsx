import React, { useEffect, useState } from 'react';
import { Paper, Box, Typography } from '@mui/material';
import letterheadBase64 from '../assets/letterhead';
import { jsPDF } from 'jspdf';

interface LetterPreviewProps {
  subject: string;
  recipient: string;
  content: string;
  closingRemarks: string;
  fontSize: number;
  fontStyle: string;
  selectedFont: string;
}

interface TextPosition {
  text: string;
  x: number;
  y: number;
}

const LetterPreview: React.FC<LetterPreviewProps> = ({
  subject,
  recipient,
  content,
  closingRemarks,
  fontSize,
  fontStyle,
  selectedFont,
}) => {
  const [textPositions, setTextPositions] = useState<TextPosition[]>([]);

  useEffect(() => {
    // Use the same PDF logic to calculate positions
    const doc = new jsPDF();
    doc.setFont(selectedFont, fontStyle);
    doc.setFontSize(fontSize);
    
    const positions: TextPosition[] = [];
    
    // Calculate positions using the same logic as pdfGenerator
    const formattedDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    positions.push({ text: `Date: ${formattedDate}`, x: 20, y: 65 });

    if (recipient) {
      positions.push({ text: recipient, x: 20, y: 85 });
      positions.push({ text: `Subject: ${subject}`, x: 20, y: 105 });
      const splitContent = doc.splitTextToSize(content, 170);
      positions.push({ text: splitContent.join('\n'), x: 20, y: 125 });
    } else {
      positions.push({ text: `Subject: ${subject}`, x: 20, y: 85 });
      const splitContent = doc.splitTextToSize(content, 170);
      positions.push({ text: splitContent.join('\n'), x: 20, y: 105 });
    }

    const contentLines = doc.splitTextToSize(content, 170).length;
    const startY = recipient ? 125 : 105;
    const closingY = startY + (contentLines * 7) + 5;
    
    const closingLines = doc.splitTextToSize(closingRemarks, 170);
    positions.push({ text: closingLines.join('\n'), x: 20, y: closingY });

    setTextPositions(positions);
  }, [subject, recipient, content, closingRemarks, fontSize, fontStyle, selectedFont]);

  return (
    <Paper 
      sx={{ 
        p: 0, 
        height: '842px',
        width: '595px',
        mx: 'auto',
        position: 'relative',
        backgroundColor: '#ffffff',
        overflow: 'hidden'
      }}
    >
      <Box
        component="img"
        src={`data:image/png;base64,${letterheadBase64}`}
        alt="Artis Laminate Letterhead"
        sx={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 2 }}>
        {textPositions.map((pos, index) => (
          <Typography
            key={index}
            sx={{
              position: 'absolute',
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              fontFamily: selectedFont,
              fontSize: `${fontSize}px`,
              fontStyle: fontStyle === 'italic' ? 'italic' : 'normal',
              fontWeight: fontStyle === 'bold' ? 'bold' : 'normal',
              color: '#2b2a29',
              whiteSpace: 'pre-wrap',
              width: '170px',
            }}
          >
            {pos.text}
          </Typography>
        ))}
      </Box>
    </Paper>
  );
};

export default LetterPreview; 