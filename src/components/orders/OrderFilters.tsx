import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown } from 'lucide-react';

interface OrderFiltersProps {
  statuses: { value: string; label: string; }[];
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
}

const statusLabels = {
  // Statuts simplifiés pour les commandes
  pending: 'En cours',
  shipping: 'En cours de livraison',
  delivered: 'Livrée',
  // Statuts workflow pour les demandes d'achat
  pending_approval: 'En attente d\'approbation',
  approved: 'Approuvé',
  supplier_search: 'Recherche fournisseurs',
  order_confirmed: 'Commande confirmée',
  shipping_antilles: 'Envoi Antilles',
  received_scanned: 'Réception scannée',
  completed: 'Terminé',
  rejected: 'Rejeté',
  cancelled: 'Annulé',
  // Legacy
  draft: 'Brouillon',
  confirmed: 'Confirmée'
};

const typeLabels = {
  all: 'Tous',
  orders: 'Commandes',
  requests: 'Demandes d\'achat'
};

export function OrderFilters({ statuses, selectedStatus, onStatusChange, selectedType, onTypeChange }: OrderFiltersProps) {
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Type Filter */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted-foreground">Type :</span>
          <Select value={selectedType} onValueChange={onTypeChange}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Sélectionner un type" />
              <ChevronDown className="h-4 w-4 opacity-50" />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              {Object.entries(typeLabels).map(([type, label]) => (
                <SelectItem key={type} value={type} className="hover:bg-muted">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted-foreground">Statut :</span>
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Sélectionner un statut" />
              <ChevronDown className="h-4 w-4 opacity-50" />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50 max-h-60 overflow-y-auto">
              <SelectItem value="all" className="hover:bg-muted">
                Tous
              </SelectItem>
              {statuses.filter(s => s.value !== 'all').map((status) => (
                <SelectItem key={status.value} value={status.value} className="hover:bg-muted">
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}