import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ship, CheckCircle, AlertTriangle } from 'lucide-react';
import { BoatRentalSelector } from './BoatRentalSelector';
import { ChecklistForm } from './ChecklistForm';
import { useAuth } from '@/contexts/AuthContext';

interface CheckInOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckInOutDialog({ open, onOpenChange }: CheckInOutDialogProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('checkin');
  const [selectedBoat, setSelectedBoat] = useState<any>(null);
  const [rentalData, setRentalData] = useState<any>(null);

  const handleCheckInComplete = (data: any) => {
    console.log('Check-in completed:', data);
    // Handle check-in completion
    onOpenChange(false);
  };

  const handleCheckOutComplete = (data: any) => {
    console.log('Check-out completed:', data);
    // Handle check-out completion  
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-marine-500" />
            Check-in / Check-out Bateau
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="checkin" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Check-in
            </TabsTrigger>
            <TabsTrigger value="checkout" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Check-out
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            <TabsContent value="checkin" className="h-full overflow-hidden">
              <div className="space-y-4 h-full overflow-auto">
                <BoatRentalSelector
                  type="checkin"
                  onBoatSelect={setSelectedBoat}
                  onRentalDataChange={setRentalData}
                />
                {selectedBoat && rentalData && (
                  <ChecklistForm
                    boat={selectedBoat}
                    rentalData={rentalData}
                    type="checkin"
                    onComplete={handleCheckInComplete}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="checkout" className="h-full overflow-hidden">
              <div className="space-y-4 h-full overflow-auto">
                <BoatRentalSelector
                  type="checkout"
                  onBoatSelect={setSelectedBoat}
                  onRentalDataChange={setRentalData}
                />
                {selectedBoat && rentalData && (
                  <ChecklistForm
                    boat={selectedBoat}
                    rentalData={rentalData}
                    type="checkout"
                    onComplete={handleCheckOutComplete}
                  />
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}