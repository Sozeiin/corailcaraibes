import React from 'react';
import { MaintenanceInterventions } from '@/components/maintenance/MaintenanceInterventions';
import { TechnicianInterventions } from '@/components/maintenance/TechnicianInterventions';
import { useAuth } from '@/contexts/AuthContext';

export default function Maintenance() {
  const { user } = useAuth();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Interventions</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            Gestion des interventions de maintenance
          </p>
        </div>
      </div>

      {user?.role === 'technicien' ? (
        <TechnicianInterventions />
      ) : (
        <MaintenanceInterventions />
      )}
    </div>
  );
}