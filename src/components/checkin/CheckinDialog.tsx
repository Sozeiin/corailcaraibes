import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { ChecklistForm } from '@/components/checkin/ChecklistForm';
import { useFormState } from '@/contexts/FormStateContext';

interface CheckinDialogProps {
  isOpen: boolean;
  onClose: () => void;
  boat: any;
  rentalData: any;
  onComplete: (data: any) => void;
  type?: 'checkin' | 'checkout';
}

export function CheckinDialog({
  isOpen,
  onClose,
  boat,
  rentalData,
  onComplete,
  type = 'checkin'
}: CheckinDialogProps) {
  const { registerForm, unregisterForm } = useFormState();

  // Enregistrer/désenregistrer le formulaire pour suspendre le refresh
  useEffect(() => {
    if (isOpen) {
      registerForm();
      console.log('📝 CheckinDialog enregistré');
    } else {
      unregisterForm();
      console.log('📝 CheckinDialog désenregistré');
    }
    
    return () => {
      unregisterForm();
    };
  }, [isOpen, registerForm, unregisterForm]);

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
      <DialogContent className="max-w-[98vw] w-[98vw] max-h-[98vh] h-[98vh] overflow-hidden p-0 gap-0">
        <div className="h-full overflow-y-auto p-6">
          <ChecklistForm
            boat={boat}
            rentalData={rentalData}
            type={type}
            onComplete={handleComplete}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
