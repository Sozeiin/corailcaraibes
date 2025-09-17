import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BoatPreparationManager } from '@/components/preparation/BoatPreparationManager';
import { PreparationTemplateManager } from '@/components/preparation/PreparationTemplateManager';
import { Ship, Settings } from 'lucide-react';

export default function BoatPreparation() {
  const { user } = useAuth();
  const isDirection = user?.role === 'direction';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Préparation des bateaux</h1>
          <p className="text-gray-600 mt-1">Gestion des préparations avant départ client</p>
        </div>
      </div>

      {isDirection ? (
        <Tabs defaultValue="preparations" className="w-full">
          <TabsList>
            <TabsTrigger value="preparations" className="flex items-center gap-2">
              <Ship className="w-4 h-4" />
              Préparations
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Modèles de checklist
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="preparations" className="mt-6">
            <BoatPreparationManager />
          </TabsContent>
          
          <TabsContent value="templates" className="mt-6">
            <PreparationTemplateManager />
          </TabsContent>
        </Tabs>
      ) : (
        <BoatPreparationManager />
      )}
    </div>
  );
}