import React from 'react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { LogIn } from 'lucide-react';
import { CheckinFormsManager } from '@/components/checkin/CheckinFormsManager';
import { TechnicianCheckinInterface } from '@/components/checkin/TechnicianCheckinInterface';
import { useAuth } from '@/contexts/AuthContext';

export default function CheckIn() {
  const { user } = useAuth();
  
  // Interface simplifiée pour techniciens et chefs de base
  const showSimplifiedInterface = user?.role === 'technicien' || user?.role === 'chef_base';

  return (
    <PermissionGate page="dashboard">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LogIn className="h-8 w-8" />
            Check-in Bateau
          </h1>
        </div>
        
        {showSimplifiedInterface ? (
          <TechnicianCheckinInterface />
        ) : (
          <CheckinFormsManager />
        )}
      </div>
    </PermissionGate>
  );
}