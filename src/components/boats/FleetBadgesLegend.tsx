import React from 'react';
import { Shield, Wrench, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const FleetBadgesLegend: React.FC = () => {
  return (
    <Card className="mb-6">
      <CardContent className="py-4">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Légende des badges de statut</span>
        </div>
        
        <div className="space-y-4">
          {/* Safety Control Badges */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Contrôles de sécurité
            </h4>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-500" />
                <span>Tous les contrôles à jour</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-500" />
                <span>1 contrôle expiré</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-500" />
                <span>2+ contrôles expirés</span>
              </div>
            </div>
          </div>

          {/* Oil Change Status Badges */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Statut vidange moteur
            </h4>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-green-500" />
                <span>Vidange OK (&lt; 200h)</span>
              </div>
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-orange-500" />
                <span>Vidange bientôt (200-249h)</span>
              </div>
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-red-500" />
                <span>Vidange urgente (≥ 250h)</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};