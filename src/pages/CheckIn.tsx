import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { TechnicianCheckinSelector } from '@/components/checkin/TechnicianCheckinSelector';
import { ChecklistForm } from '@/components/checkin/ChecklistForm';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function CheckIn() {
  const { user } = useAuth();
  const [selectedBoat, setSelectedBoat] = useState(null);
  const [rentalData, setRentalData] = useState(null);
  const [showChecklist, setShowChecklist] = useState(false);

  // Get available boats
  const { data: boats = [] } = useQuery({
    queryKey: ['boats-available', user?.baseId],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('boats')
        .select('*')
        .eq('status', 'available')
        .order('name');

      if (user.role !== 'direction') {
        query = query.eq('base_id', user.baseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const handleFormSelect = (formData: any) => {
    setSelectedBoat(formData.boat);
    setRentalData(formData.rentalData);
    setShowChecklist(true);
  };

  const handleManualCheckin = () => {
    setShowChecklist(true);
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
          <LogIn className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Check-in Bateau</h1>
        </div>

        {!showChecklist ? (
          <TechnicianCheckinSelector
            boats={boats}
            onFormSelect={handleFormSelect}
            onManualCheckin={handleManualCheckin}
          />
        ) : (
          <ChecklistForm
            boat={selectedBoat}
            rentalData={rentalData}
            type="checkin"
            onComplete={handleChecklistComplete}
          />
        )}
      </div>
    </PermissionGate>
  );
}