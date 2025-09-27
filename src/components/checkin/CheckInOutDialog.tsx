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
  preselectedBoat?: any;
  preselectedType?: 'checkin' | 'checkout';
  preselectedRentalData?: any;
  onComplete?: (data: any) => void;
}

export function CheckInOutDialog({ 
  open, 
  onOpenChange,
  preselectedBoat,
  preselectedType,
  preselectedRentalData,
  onComplete 
}: CheckInOutDialogProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('checkin');
  const [selectedBoat, setSelectedBoat] = useState<any>(null);
  const [rentalData, setRentalData] = useState<any>(null);

  // Reset selections when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSelectedBoat(null);
    setRentalData(null);
  };

  const handleCheckInComplete = (data: any) => {
    // Handle check-in completion
    if (onComplete) {
      onComplete({ ...data, checklistId: data.id });
    } else {
      onOpenChange(false);
    }
  };

  const handleCheckOutComplete = (data: any) => {
    // Handle check-out completion  
    if (onComplete) {
      onComplete({ ...data, checklistId: data.id });
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-marine-500" />
            Check-in / Check-out Bateau
          </DialogTitle>
          <DialogDescription>
            Gérez les inspections et les locations de bateaux avec le système de check-in/check-out.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mx-6 mt-4 flex-shrink-0">
              <TabsTrigger value="checkin" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Check-in
              </TabsTrigger>
              <TabsTrigger value="checkout" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Check-out
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="checkin" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="space-y-4">
                    <BoatRentalSelector
                      type="checkin"
                      preselectedBoat={preselectedBoat}
                      preselectedRentalData={preselectedRentalData}
                      onBoatSelect={(boat) => {
                        setSelectedBoat(boat);
                      }}
                      onRentalDataChange={(data) => {
                        setRentalData(data);
                      }}
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
                </div>
              </TabsContent>

              <TabsContent value="checkout" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="space-y-4">
                    <BoatRentalSelector
                      type="checkout"
                      preselectedBoat={preselectedBoat}
                      preselectedRentalData={preselectedRentalData}
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
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}