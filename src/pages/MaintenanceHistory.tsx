import React from 'react';
import { MaintenanceHistory } from '@/components/maintenance/MaintenanceHistory';

export default function MaintenanceHistoryPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Historique Maintenance</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            Consulter l'historique complet des interventions
          </p>
        </div>
      </div>

      <MaintenanceHistory />
    </div>
  );
}