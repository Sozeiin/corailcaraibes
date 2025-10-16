import React from 'react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { LogIn } from 'lucide-react';
import { CheckinFormsManager } from '@/components/checkin/CheckinFormsManager';

export default function CheckIn() {
  return (
    <PermissionGate page="dashboard">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LogIn className="h-8 w-8" />
            Check-in Bateau
          </h1>
        </div>
        
        <CheckinFormsManager />
      </div>
    </PermissionGate>
  );
}