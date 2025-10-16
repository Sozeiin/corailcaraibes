import React from 'react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { LogOut } from 'lucide-react';
import { TechnicianCheckoutInterface } from '@/components/checkin/TechnicianCheckoutInterface';
import { useAuth } from '@/contexts/AuthContext';

export default function CheckOut() {
  const { user } = useAuth();
  
  // Pour l'instant, seuls les techniciens et chefs de base ont accès
  const hasAccess = user?.role === 'technicien' || user?.role === 'chef_base';

  if (!hasAccess) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-muted-foreground">
            Accès réservé aux techniciens et chefs de base
          </h1>
        </div>
      </div>
    );
  }

  return (
    <PermissionGate page="dashboard">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LogOut className="h-8 w-8" />
            Check-out Bateau
          </h1>
          <p className="text-muted-foreground mt-2">
            Finaliser les locations et effectuer l'inspection de retour
          </p>
        </div>
        
        <TechnicianCheckoutInterface />
      </div>
    </PermissionGate>
  );
}
