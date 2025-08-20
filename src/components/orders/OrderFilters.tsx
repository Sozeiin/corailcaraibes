import React from 'react';
import { Badge } from '@/components/ui/badge';

interface OrderFiltersProps {
  statuses: { value: string; label: string; }[];
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
}

const statusLabels = {
  // Nouveaux statuts du workflow
  draft: 'Brouillon',
  pending_approval: 'En attente d\'approbation',
  approved: 'Approuvé',
  supplier_search: 'Recherche fournisseurs',
  order_confirmed: 'Commande confirmée',
  shipping_antilles: 'Envoi Antilles',
  received_scanned: 'Réception scannée',
  completed: 'Terminé',
  rejected: 'Rejeté',
  cancelled: 'Annulé',
  // Anciens statuts (legacy)
  pending: 'En attente',
  confirmed: 'Confirmée',
  delivered: 'Livrée',
  supplier_requested: 'Demande effectuée',
  shipping_mainland: 'Livraison Métropole'
};

const typeLabels = {
  all: 'Tous',
  orders: 'Commandes',
  requests: 'Demandes d\'achat'
};

export function OrderFilters({ statuses, selectedStatus, onStatusChange, selectedType, onTypeChange }: OrderFiltersProps) {
  return (
    <div className="mt-4 space-y-3">
      {/* Type Filter */}
      <div>
        <span className="text-sm font-medium text-muted-foreground mb-2 block">Type :</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(typeLabels).map(([type, label]) => (
            <Badge
              key={type}
              variant={selectedType === type ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => onTypeChange(type)}
            >
              {label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div>
        <span className="text-sm font-medium text-muted-foreground mb-2 block">Statut :</span>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedStatus === 'all' ? 'default' : 'secondary'}
            className="cursor-pointer"
            onClick={() => onStatusChange('all')}
          >
            Tous
          </Badge>
          {statuses.filter(s => s.value !== 'all').map((status) => (
            <Badge
              key={status.value}
              variant={selectedStatus === status.value ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => onStatusChange(status.value)}
            >
              {status.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}