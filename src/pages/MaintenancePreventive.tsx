import React from 'react';
import { PreventiveMaintenance } from '@/components/maintenance/PreventiveMaintenance';
export default function MaintenancePreventivePage() {
  return <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="my-0 py-0 px-[300px]">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Maintenance Préventive</h1>
          
        </div>
      </div>

      <PreventiveMaintenance />
    </div>;
}