import React from 'react';
import { MaintenanceInterventions } from '@/components/maintenance/MaintenanceInterventions';
import { TechnicianInterventions } from '@/components/maintenance/TechnicianInterventions';
import { useAuth } from '@/contexts/AuthContext';

// ID de la base Martinique
const MARTINIQUE_BASE_ID = '550e8400-e29b-41d4-a716-446655440001';

export default function Maintenance() {
  const { user } = useAuth();

  // Détection des techniciens Martinique
  const isMartiniqueTechnician = 
    user?.role === 'technicien' && 
    user?.baseId === MARTINIQUE_BASE_ID;
  
  // Afficher l'interface complète pour Direction, Chef de base, et techniciens Martinique
  const showFullInterface = 
    user?.role === 'direction' || 
    user?.role === 'chef_base' || 
    isMartiniqueTechnician;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          
        </div>
      </div>

      {showFullInterface ? (
        <MaintenanceInterventions />
      ) : (
        <TechnicianInterventions />
      )}
    </div>
  );
}