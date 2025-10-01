import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ChecklistForm } from './ChecklistForm';

interface CheckinSheetProps {
  isOpen: boolean;
  onClose: () => void;
  boat: any;
  rentalData: any;
  onComplete: (data: any) => void;
}

export function CheckinSheet({
  isOpen,
  onClose,
  boat,
  rentalData,
  onComplete,
}: CheckinSheetProps) {
  const handleComplete = (data: any) => {
    onComplete(data);
    if (data !== null) {
      onClose();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[85vw] max-w-5xl p-0 overflow-hidden">
        <div className="h-full overflow-y-auto p-6">
          <SheetHeader className="mb-6">
            <SheetTitle>Check-in Technique</SheetTitle>
          </SheetHeader>
          <ChecklistForm
            boat={boat}
            rentalData={rentalData}
            type="checkin"
            onComplete={handleComplete}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
