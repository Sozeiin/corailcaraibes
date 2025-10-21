import React from 'react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { LogIn } from 'lucide-react';
import { CheckinFormsManager } from '@/components/checkin/CheckinFormsManager';
import { TechnicianCheckinInterface } from '@/components/checkin/TechnicianCheckinInterface';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CheckIn() {
  const { user } = useAuth();
  
  // Interface complète pour administratif et direction (gestion uniquement)
  const showFullInterface = user?.role === 'administratif' || user?.role === 'direction';
  
  // Interface hybride pour chef_base (gestion + check-in/out)
  const showHybridInterface = user?.role === 'chef_base';
  
  // Interface simplifiée pour techniciens (check-in/out uniquement)
  const showSimplifiedInterface = user?.role === 'technicien';

  return (
    <PermissionGate page="dashboard">
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
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des fiches clients</CardTitle>
              </CardHeader>
              <CardContent>
                <CheckinFormsManager />
              </CardContent>
            </Card>
            
            <Separator className="my-8" />
            
            <Card>
              <CardHeader>
                <CardTitle>Check-in / Check-out rapide</CardTitle>
              </CardHeader>
              <CardContent>
                <TechnicianCheckinInterface />
              </CardContent>
            </Card>
          </div>
        )}
        
        {showSimplifiedInterface && (
          <TechnicianCheckinInterface />
        )}
      </div>
    </PermissionGate>
  );
}