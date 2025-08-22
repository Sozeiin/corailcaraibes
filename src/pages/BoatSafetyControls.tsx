import React from 'react';
import { useParams } from 'react-router-dom';
import { BoatSafetyControlHistory } from '@/components/boats/BoatSafetyControlHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
import { OilChangeStatusBadge } from '@/components/boats/OilChangeStatusBadge';

export const BoatSafetyControls = () => {
  const { boatId } = useParams<{ boatId: string }>();
  const navigate = useNavigate();

  // Fetch boat data for oil change badge
  const { data: boat } = useOfflineData<any>({
    table: 'boats',
    dependencies: [boatId]
  });

  const currentBoat = boat?.find((b: any) => b.id === boatId);

  if (!boatId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">ID du bateau manquant</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/boats')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux bateaux
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Contrôles de Sécurité</h1>
          </div>
          {currentBoat && (
            <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-lg">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Vidange:</span>
              <OilChangeStatusBadge 
                currentEngineHours={currentBoat.current_engine_hours || 0}
                lastOilChangeHours={currentBoat.last_oil_change_hours || 0}
                size="sm"
              />
              <span className="text-sm text-muted-foreground">
                {Math.max(0, 250 - ((currentBoat.current_engine_hours || 0) - (currentBoat.last_oil_change_hours || 0)))}h restantes
              </span>
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestion des contrôles de sécurité</CardTitle>
        </CardHeader>
        <CardContent>
          <BoatSafetyControlHistory boatId={boatId} />
        </CardContent>
      </Card>
    </div>
  );
};