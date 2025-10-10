import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { ChecklistForm } from '@/components/checkin/ChecklistForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogIn, ArrowLeft } from 'lucide-react';

interface CheckInProcessState {
  boat: any;
  rentalData: any;
}

export default function CheckInProcess() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as CheckInProcessState;

  React.useEffect(() => {
    if (!state?.boat || !state?.rentalData) {
      navigate('/checkin', { replace: true });
    }
  }, [state, navigate]);

  const handleChecklistComplete = (data: any) => {
    if (data === null) {
      navigate('/checkin', { replace: true });
      return;
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
