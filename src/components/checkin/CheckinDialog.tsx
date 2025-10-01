import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { ChecklistForm } from '@/components/checkin/ChecklistForm';

interface CheckinDialogProps {
  isOpen: boolean;
  onClose: () => void;
  boat: any;
  rentalData: any;
  onComplete: (data: any) => void;
}

export function CheckinDialog({
  isOpen,
  onClose,
  boat,
  rentalData,
  onComplete
}: CheckinDialogProps) {
  const handleComplete = (data: any) => {
    onComplete(data);
    if (data !== null) {
      onClose();
    }
  };

  const handleCancel = () => {
    onComplete(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto p-0">
        <div className="p-6">
          <ChecklistForm
            boat={boat}
            rentalData={rentalData}
            type="checkin"
            onComplete={handleComplete}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
