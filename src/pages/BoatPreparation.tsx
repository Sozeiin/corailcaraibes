import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BoatPreparationManager } from '@/components/preparation/BoatPreparationManager';
import { PreparationTemplateManager } from '@/components/preparation/PreparationTemplateManager';
import { TechnicianPreparations } from '@/components/preparation/TechnicianPreparations';
import { Ship, Settings } from 'lucide-react';
export default function BoatPreparation() {
  const {
    user
  } = useAuth();
  const isDirection = user?.role === 'direction';
  const isTechnician = user?.role === 'technicien';
  const canManagePreparations = ['direction', 'chef_base', 'administratif'].includes(user?.role || '');
  return <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Préparation et retour des bateaux</h1>
          <p className="text-gray-600 mt-1">Gestion des préparations avant départ client</p>
        </div>
      </div>

      {isTechnician ? <TechnicianPreparations /> : isDirection ? <Tabs defaultValue="templates" className="w-full">
          <TabsList>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Modèles de checklist
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="templates" className="mt-6">
            <PreparationTemplateManager />
          </TabsContent>
        </Tabs> : canManagePreparations ? <BoatPreparationManager /> : <div className="text-center py-8">
          <p className="text-gray-500">Accès non autorisé</p>
        </div>}
    </div>;
}