import React, { useState } from 'react';
import { BoatRentalSelector } from '@/components/checkin/BoatRentalSelector';
import { ChecklistForm } from '@/components/checkin/ChecklistForm';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut } from 'lucide-react';

export default function CheckOut() {
  const [selectedBoat, setSelectedBoat] = useState(null);
  const [rentalData, setRentalData] = useState(null);
  const [showChecklist, setShowChecklist] = useState(false);

  const handleBoatSelect = (boat: any) => {
    setSelectedBoat(boat);
    if (boat && rentalData) {
      setShowChecklist(true);
    }
  };

  const handleRentalDataChange = (data: any) => {
    setRentalData(data);
    if (selectedBoat && data?.isValid) {
      setShowChecklist(true);
    }
  };

  const handleChecklistComplete = () => {
    setSelectedBoat(null);
    setRentalData(null);
    setShowChecklist(false);
  };

  return (
    <PermissionGate page="dashboard">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <LogOut className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Check-out Bateau</h1>
        </div>

        {!showChecklist ? (
          <Card>
            <CardHeader>
              <CardTitle>Sélection du bateau en location</CardTitle>
            </CardHeader>
            <CardContent>
              <BoatRentalSelector
                type="checkout"
                onBoatSelect={handleBoatSelect}
                onRentalDataChange={handleRentalDataChange}
              />
            </CardContent>
          </Card>
        ) : (
          <ChecklistForm
            boat={selectedBoat}
            rentalData={rentalData}
            type="checkout"
            onComplete={handleChecklistComplete}
          />
        )}
      </div>
    </PermissionGate>
  );
}