import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdministrativeCheckinForm } from '@/components/checkin/AdministrativeCheckinForm';
import { TechnicianCheckinSelector } from '@/components/checkin/TechnicianCheckinSelector';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function CheckIn() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [resetKey, setResetKey] = React.useState(0);

  React.useEffect(() => {
    if ((location.state as { resetChecklist?: boolean } | null)?.resetChecklist) {
      setResetKey(prev => prev + 1);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

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

  const startCheckinFlow = (boat: any, rentalData: any) => {
    navigate('/checkin/process', {
      state: {
        boat,
        rentalData
      }
    });
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
            onFormSelect={({ boat, rentalData }) => startCheckinFlow(boat, rentalData)}
            onManualCheckin={(boat, rentalData) => startCheckinFlow(boat, rentalData)}
          />
        )}
      </div>
    </PermissionGate>
  );
}