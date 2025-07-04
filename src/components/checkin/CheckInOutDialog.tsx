import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

  console.log('CheckInOutDialog render - open:', open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-marine-500" />
            Check-in / Check-out Bateau
          </DialogTitle>
          <DialogDescription>
            Gérez les inspections et les locations de bateaux avec le système de check-in/check-out.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
            <TabsTrigger value="checkin" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Check-in
            </TabsTrigger>
            <TabsTrigger value="checkout" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Check-out
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 mt-4">
            <TabsContent value="checkin" className="h-full m-0">
              <div className="space-y-4 h-full overflow-y-auto pr-2">
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

            <TabsContent value="checkout" className="h-full m-0">
              <div className="space-y-4 h-full overflow-y-auto pr-2">
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