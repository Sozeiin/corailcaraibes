import React from 'react';
import { AdministrativeCheckinManager } from '@/components/administrative/AdministrativeCheckinManager';
import { PermissionGate } from '@/components/auth/PermissionGate';

export default function AdministrativeCheckin() {
  return (
    <PermissionGate page="dashboard">
      <div className="container mx-auto p-6">
        <AdministrativeCheckinManager />
      </div>
    </PermissionGate>
  );
}