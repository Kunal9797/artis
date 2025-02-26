import React from 'react';
import { Dialog, DialogContent } from '@mui/material';
import DealerVisitForm from './DealerVisitForm';

interface DealerVisitDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

const DealerVisitDialog: React.FC<DealerVisitDialogProps> = ({ open, onClose, onSubmit }) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogContent>
        <DealerVisitForm 
          onSubmit={() => {
            onSubmit();
            onClose();
          }}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};

export default DealerVisitDialog; 