import React from 'react';
import { Shield, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const SafetyStatusLegend: React.FC = () => {
  return (
    <Card className="mb-6">
      <CardContent className="py-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Légende des statuts de sécurité</span>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-sm">
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
      </CardContent>
    </Card>
  );
};