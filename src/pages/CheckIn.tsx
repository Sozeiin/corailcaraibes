import React from 'react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { LogIn, FileText, ArrowRightLeft } from 'lucide-react';
import { CheckinFormsManager } from '@/components/checkin/CheckinFormsManager';
import { TechnicianCheckinInterface } from '@/components/checkin/TechnicianCheckinInterface';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CheckIn() {
  const { user } = useAuth();
  
  // Interface complète pour administratif et direction (gestion uniquement)
  const showFullInterface = user?.role === 'administratif' || user?.role === 'direction';
  
  // Interface hybride pour chef_base (gestion + check-in/out)
  const showHybridInterface = user?.role === 'chef_base';
  
  // Interface simplifiée pour techniciens (check-in/out uniquement)
  const showSimplifiedInterface = user?.role === 'technicien';

  return (
    <PermissionGate page="checkin">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LogIn className="h-8 w-8" />
            Check-in Bateau
          </h1>
        </div>
        
        {showFullInterface && (
          <CheckinFormsManager />
        )}
        
        {showHybridInterface && (
          <Tabs defaultValue="forms" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="forms" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Gestion des fiches
              </TabsTrigger>
              <TabsTrigger value="checkin" className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Check-in / Check-out
              </TabsTrigger>
            </TabsList>

            <TabsContent value="forms">
              <CheckinFormsManager />
            </TabsContent>

            <TabsContent value="checkin">
              <TechnicianCheckinInterface />
            </TabsContent>
          </Tabs>
        )}
        
        {showSimplifiedInterface && (
          <TechnicianCheckinInterface />
        )}
      </div>
    </PermissionGate>
  );
}