import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdministrativeCheckinForm } from '@/components/checkin/AdministrativeCheckinForm';
import { TechnicianCheckinSelector } from '@/components/checkin/TechnicianCheckinSelector';
import { CheckinSheet } from '@/components/checkin/CheckinSheet';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function CheckIn() {
  const { user } = useAuth();
  const [selectedBoat, setSelectedBoat] = useState(null);
  const [rentalData, setRentalData] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);

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
    console.log('📝 [CHECKIN] Fiche sélectionnée:', formData);
    setSelectedBoat(formData.boat);
    setRentalData(formData.rentalData);
    setSheetOpen(true);
  };

  const handleManualCheckin = () => {
    setSheetOpen(true);
  };

  const handleChecklistComplete = async (data: any) => {
    // Si data est null, c'est une annulation - on fait juste un retour arrière
    if (data === null) {
      console.log('🔙 [CHECKIN] Annulation - Retour à la liste des fiches');
      setSheetOpen(false);
      setSelectedBoat(null);
      setRentalData(null);
      return;
    }
    
    // Sinon c'est une finalisation réussie
    console.log('✅ [CHECKIN] Finalisation réussie, reset complet');
    setSelectedBoat(null);
    setRentalData(null);
    setSheetOpen(false);
    setResetKey(prev => prev + 1);
  };

  const handleSheetClose = () => {
    setSheetOpen(false);
    setSelectedBoat(null);
    setRentalData(null);
  };

  const handleFormCreated = () => {
    // Refresh is handled by the query
  };

  return (
    <PermissionGate page="dashboard">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <LogIn className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Check-in Bateau</h1>
        </div>

        {user?.role === 'administratif' ? (
          <AdministrativeCheckinForm
            boats={boats}
            onFormCreated={handleFormCreated}
          />
        ) : (
          <TechnicianCheckinSelector
            key={resetKey}
            boats={boats}
            onFormSelect={handleFormSelect}
            onManualCheckin={handleManualCheckin}
          />
        )}

        <CheckinSheet
          isOpen={sheetOpen}
          onClose={handleSheetClose}
          boat={selectedBoat}
          rentalData={rentalData}
          onComplete={handleChecklistComplete}
        />
      </div>
    </PermissionGate>
  );
}