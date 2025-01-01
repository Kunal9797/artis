import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
} from '@mui/material';
import { generateCustomLetterPDF } from '../utils/pdfGenerator';
import { useTheme } from '../context/ThemeContext';
import { MenuItem } from '@mui/material';

const CustomLetter: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [subject, setSubject] = useState('');
  const [recipient, setRecipient] = useState('');
  const [content, setContent] = useState('');
  const [closingRemarks, setClosingRemarks] = useState('Best regards,\nArtis Laminate');
  const [fontSize, setFontSize] = useState(11);
  const [fontStyle, setFontStyle] = useState('normal');
  const [selectedFont, setSelectedFont] = useState('helvetica');

  const handleGenerateLetter = async () => {
    if (!content.trim() || !subject.trim()) return;
    
    try {
      await generateCustomLetterPDF({
        subject,
        recipient,
        content,
        closingRemarks,
        date: new Date(),
        fontSize,
        fontStyle,
        font: selectedFont
      });
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      if (error instanceof Error) {
        alert(`Failed to generate PDF: ${error.message}`);
      } else {
        alert('Failed to generate PDF: Unknown error');
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 4, maxWidth: '800px', mx: 'auto' }}>
        <Typography variant="h5" sx={{ mb: 3, color: isDarkMode ? '#ffffff' : '#2b2a29' }}>
          Create Custom Letter
        </Typography>
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
            <TextField
              select
              label="Font Size"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              sx={{ width: 120 }}
              size="small"
            >
              {[8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20].map((size) => (
                <MenuItem key={size} value={size}>
                  {size}px
                </MenuItem>
              ))}
            </TextField>
            
            <TextField
              select
              label="Font Style"
              value={fontStyle}
              onChange={(e) => setFontStyle(e.target.value)}
              sx={{ width: 120 }}
              size="small"
            >
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="bold">Bold</MenuItem>
              <MenuItem value="italic">Italic</MenuItem>
            </TextField>

            <TextField
              select
              label="Font"
              value={selectedFont}
              onChange={(e) => setSelectedFont(e.target.value)}
              sx={{ width: 120 }}
              size="small"
            >
              <MenuItem value="helvetica">Helvetica</MenuItem>
              <MenuItem value="times">Times</MenuItem>
              <MenuItem value="courier">Courier</MenuItem>
              <MenuItem value="georgia">Georgia</MenuItem>
              <MenuItem value="arial">Arial</MenuItem>
              <MenuItem value="verdana">Verdana</MenuItem>
              <MenuItem value="trebuchet">Trebuchet MS</MenuItem>
              <MenuItem value="cambria">Cambria</MenuItem>
            </TextField>
          </Box>

          <TextField
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            fullWidth
          />

          <TextField
            label="Recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            fullWidth
            placeholder="Dear Sir/Madam"
          />
          
          <TextField
            multiline
            rows={8}
            fullWidth
            label="Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <TextField
            label="Closing Remarks"
            value={closingRemarks}
            onChange={(e) => setClosingRemarks(e.target.value)}
            multiline
            rows={3}
            fullWidth
            placeholder="Enter your closing remarks..."
          />

          <Button
            variant="contained"
            onClick={handleGenerateLetter}
            disabled={!content.trim() || !subject.trim()}
            sx={{ 
              bgcolor: '#2b2a29',
              '&:hover': { bgcolor: '#404040' }
            }}
          >
            Generate Letter
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default CustomLetter; 