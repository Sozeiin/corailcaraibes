import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { BoatRentalSelector } from './BoatRentalSelector';

interface ManualCheckinSheetProps {
  isOpen: boolean;
  onClose: () => void;
  boats: any[];
  onProceed: (boat: any, rentalData: any) => void;
}

export function ManualCheckinSheet({
  isOpen,
  onClose,
  boats,
  onProceed,
}: ManualCheckinSheetProps) {
  const [selectedBoat, setSelectedBoat] = useState(null);
  const [rentalData, setRentalData] = useState(null);

  const handleRentalDataChange = (data: any) => {
    setRentalData(data);
    if (selectedBoat && data?.isValid) {
      onProceed(selectedBoat, data);
      onClose();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[85vw] max-w-5xl p-0 overflow-hidden">
        <div className="h-full overflow-y-auto p-6">
          <SheetHeader className="mb-6">
            <SheetTitle>Check-in manuel</SheetTitle>
          </SheetHeader>
          <BoatRentalSelector
            type="checkin"
            mode="technician"
            onBoatSelect={setSelectedBoat}
            onRentalDataChange={handleRentalDataChange}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
