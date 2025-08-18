import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
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
  const {
    boatId
  } = useParams<{
    boatId: string;
  }>();
  const navigate = useNavigate();
  console.log('BoatDetails rendered with boatId:', boatId);
  const { data: boats = [], loading: isLoading } = useOfflineData<any>({ table: 'boats' });
  const { data: bases = [] } = useOfflineData<any>({ table: 'bases' });

  const boat = boats.find((b: any) => b.id === boatId);
  const boatBase = bases.find((b: any) => b.id === boat?.base_id);
  const boatWithBase = boat ? { ...boat, base: boatBase } : null;

  if (isLoading) {
    return <LoadingSpinner />;
  }
  if (!boatWithBase) {
    return <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-2xl font-semibold">Bateau non trouvé</h2>
        <Button onClick={() => navigate('/boats')}>
          Retour aux bateaux
        </Button>
      </div>;
  }
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/boats')} className="text-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            
          </Button>
          <div>
            <h1 className="font-bold text-3xl text-[#f975c4] text-right mx-[33px]">{boatWithBase.name}</h1>
            
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${boatWithBase.status === 'available' ? 'bg-green-100 text-green-800' : boatWithBase.status === 'rented' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
            {boatWithBase.status === 'available' ? 'Disponible' : boatWithBase.status === 'rented' ? 'En location' : boatWithBase.status === 'maintenance' ? 'En maintenance' : 'Hors service'}
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
              <p className="text-lg">{boatWithBase.model}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Année</p>
              <p className="text-lg">{boatWithBase.year}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">N° de série</p>
              <p className="text-lg">{boatWithBase.serial_number}</p>
            </div>
            {boatWithBase.next_maintenance && <div>
                <p className="text-sm font-medium text-muted-foreground">Prochaine maintenance</p>
                <p className="text-lg">{new Date(boatWithBase.next_maintenance).toLocaleDateString()}</p>
              </div>}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Base</p>
              <p className="text-lg">{boatWithBase.base?.name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Home</span>
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
          <BoatDashboard boatId={boatWithBase.id} boatName={boatWithBase.name} />
        </TabsContent>

        <TabsContent value="components" className="space-y-6">
          <BoatComponentsManager boatId={boatWithBase.id} boatName={boatWithBase.name} />
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <BoatMaintenancePlanner boatId={boatWithBase.id} boatName={boatWithBase.name} />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <BoatHistoryContent boatId={boatWithBase.id} />
        </TabsContent>
      </Tabs>
    </div>;
};