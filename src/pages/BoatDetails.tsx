import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Settings, Wrench, History, BarChart3 } from 'lucide-react';
import { BoatComponentsManager } from '@/components/boats/BoatComponentsManager';
import { BoatHistoryContent } from '@/components/boats/BoatHistoryContent';
import { BoatMaintenancePlanner } from '@/components/boats/BoatMaintenancePlanner';
import { BoatDashboard } from '@/components/boats/BoatDashboard';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export const BoatDetails = () => {
  const { boatId } = useParams<{ boatId: string }>();
  const navigate = useNavigate();
  console.log('BoatDetails rendered with boatId:', boatId);

  const { data: boat, isLoading } = useQuery({
    queryKey: ['boat', boatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boats')
        .select(`
          *,
          base:bases(name)
        `)
        .eq('id', boatId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!boatId,
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!boat) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-2xl font-semibold">Bateau non trouvé</h2>
        <Button onClick={() => navigate('/boats')}>
          Retour aux bateaux
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/boats')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{boat.name}</h1>
            <p className="text-muted-foreground">
              {boat.model} • {boat.year} • {boat.base?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            boat.status === 'available' 
              ? 'bg-green-100 text-green-800'
              : boat.status === 'rented'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {boat.status === 'available' ? 'Disponible' : 
             boat.status === 'rented' ? 'En location' : 
             boat.status === 'maintenance' ? 'En maintenance' : 'Hors service'}
          </span>
        </div>
      </div>

      {/* Boat Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Informations générales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Modèle</p>
              <p className="text-lg">{boat.model}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Année</p>
              <p className="text-lg">{boat.year}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">N° HIN</p>
              <p className="text-lg">{boat.hin}</p>
            </div>
            {boat.hull_number && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">N° de coque</p>
                <p className="text-lg">{boat.hull_number}</p>
              </div>
            )}
            {boat.next_maintenance && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Prochaine maintenance</p>
                <p className="text-lg">{new Date(boat.next_maintenance).toLocaleDateString()}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Base</p>
              <p className="text-lg">{boat.base?.name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Tableau de bord</span>
          </TabsTrigger>
          <TabsTrigger value="components" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Composants</span>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center space-x-2">
            <Wrench className="h-4 w-4" />
            <span>Maintenance</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <History className="h-4 w-4" />
            <span>Historique</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <BoatDashboard boatId={boat.id} boatName={boat.name} />
        </TabsContent>

        <TabsContent value="components" className="space-y-6">
          <BoatComponentsManager boatId={boat.id} boatName={boat.name} />
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <BoatMaintenancePlanner boatId={boat.id} boatName={boat.name} />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <BoatHistoryContent boatId={boat.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};