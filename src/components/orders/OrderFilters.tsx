import React from 'react';
import { X, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface OrderFiltersProps {
  statuses: string[];
  selectedStatus: string;
  onStatusChange: (status: string) => void;
}

const statusLabels = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  delivered: 'Livrée', 
  cancelled: 'Annulée'
};

export function OrderFilters({ 
  statuses, 
  selectedStatus, 
  onStatusChange 
}: OrderFiltersProps) {
  const clearFilters = () => {
    onStatusChange('all');
  };

  const hasActiveFilters = selectedStatus !== 'all';

  return (
    <div className="border-t pt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Statut :</span>
        </div>
        
        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {statuses.filter(status => status && status.trim() !== '').map((status) => (
              <SelectItem key={status} value={status}>
                {statusLabels[status as keyof typeof statusLabels] || status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4 mr-1" />
            Effacer les filtres
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">Filtres actifs :</span>
          {selectedStatus && selectedStatus !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {statusLabels[selectedStatus as keyof typeof statusLabels] || selectedStatus}
              <button
                onClick={() => onStatusChange('all')}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}