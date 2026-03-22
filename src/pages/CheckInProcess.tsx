import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { ChecklistForm } from '@/components/checkin/ChecklistForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogIn, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CheckInProcessState {
  boat: any;
  rentalData: any;
  formId?: string;
  isOneWay?: boolean;
  destinationBaseId?: string;
  baseId?: string;
  boatId?: string;
}

export default function CheckInProcess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const state = (location.state || {}) as CheckInProcessState;

  React.useEffect(() => {
    if (!state?.boat || !state?.rentalData) {
      navigate('/checkin', { replace: true });
    }
  }, [state, navigate]);

  const handleChecklistComplete = async (data: any) => {
    if (data === null) {
      navigate('/checkin', { replace: true });
      return;
    }

    // Mark the administrative form as used
    if (state.formId) {
      const { error: formError } = await supabase
        .from('administrative_checkin_forms')
        .update({
          status: 'used',
          used_by: user?.id,
          used_at: new Date().toISOString(),
        })
        .eq('id', state.formId);

      if (formError) {
        console.error('Error updating form status:', formError);
        toast.error('Erreur lors de la mise à jour du formulaire');
      }

      // ONE WAY: transfer boat to destination base immediately
      if (state.isOneWay && state.destinationBaseId && state.boatId) {
        const { error: transferError } = await supabase
          .from('boats')
          .update({
            base_id: state.destinationBaseId,
            status: 'rented' as any,
            updated_at: new Date().toISOString(),
          })
          .eq('id', state.boatId);

        if (transferError) {
          console.error('Error transferring boat for ONE WAY:', transferError);
          toast.error('Erreur lors du transfert ONE WAY du bateau');
        } else {
          console.log('ONE WAY: boat transferred to destination base at check-in (CheckInProcess)');
          toast.success('Bateau transféré vers la base de destination (ONE WAY)');
        }

        // Create boat_base_transfer record
        if (state.baseId) {
          await supabase
            .from('boat_base_transfers')
            .insert({
              boat_id: state.boatId,
              from_base_id: state.baseId,
              to_base_id: state.destinationBaseId,
              reason: 'Location ONE WAY - transfert automatique au check-in',
              transferred_by: user?.id,
            });
        }
      }
    }

    navigate('/checkin', {
      replace: true,
      state: {
        resetChecklist: true,
      },
    });
  };

  if (!state?.boat || !state?.rentalData) {
    return null;
  }

  return (
    <PermissionGate page="dashboard">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/checkin', { replace: true })}
              className="rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <LogIn className="h-6 w-6" />
                <h1 className="text-2xl font-bold">Check-in du bateau</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {state.boat?.name} • {state.rentalData?.customerName || 'Client non renseigné'}
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <ChecklistForm
              boat={state.boat}
              rentalData={state.rentalData}
              type="checkin"
              onComplete={handleChecklistComplete}
            />
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
