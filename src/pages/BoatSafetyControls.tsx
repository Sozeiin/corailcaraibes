import React from 'react';
import { useParams } from 'react-router-dom';
import { BoatSafetyControlHistory } from '@/components/boats/BoatSafetyControlHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const BoatSafetyControls = () => {
  const { boatId } = useParams<{ boatId: string }>();
  const navigate = useNavigate();

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
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Contrôles de Sécurité</h1>
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