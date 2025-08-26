import React from 'react';
import { useParams } from 'react-router-dom';
import { BoatSafetyControlHistory } from '@/components/boats/BoatSafetyControlHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
import { OilChangeStatusBadge } from '@/components/boats/OilChangeStatusBadge';
import type { EngineComponent } from '@/utils/engineMaintenanceUtils';

export const BoatSafetyControls = () => {
  const { boatId } = useParams<{ boatId: string }>();
  const navigate = useNavigate();

  const { data: components = [] } = useOfflineData<any>({
    table: 'boat_components',
    dependencies: [boatId]
  });

  const engineComponents: EngineComponent[] = components
    .filter((c: any) => c.boat_id === boatId && c.component_type?.toLowerCase().includes('moteur'))
    .map((c: any) => ({
      id: c.id,
      component_name: c.component_name,
      component_type: c.component_type,
      current_engine_hours: c.current_engine_hours,
      last_oil_change_hours: c.last_oil_change_hours
    }));

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
          onClick={() => navigate('/safety-controls')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux contrôles
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Contrôles de Sécurité</h1>
          </div>
          {engineComponents.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-lg">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">État moteurs:</span>
              <OilChangeStatusBadge 
                engines={engineComponents}
                size="sm"
              />
              <span className="text-sm text-muted-foreground">
                {engineComponents.length} moteur{engineComponents.length > 1 ? 's' : ''}
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