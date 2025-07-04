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

interface BoatFiltersProps {
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedBase: string;
  onBaseChange: (baseId: string) => void;
  bases: Array<{ id: string; name: string }>;
  userRole: string;
}

export function BoatFilters({ 
  selectedStatus, 
  onStatusChange,
  selectedBase,
  onBaseChange,
  bases,
  userRole
}: BoatFiltersProps) {
  const clearFilters = () => {
    onStatusChange('all');
    onBaseChange('all');
  };

  const hasActiveFilters = selectedStatus !== 'all' || selectedBase !== 'all';

  return (
    <div className="border-t pt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtres :</span>
        </div>
        
        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="available">Disponible</SelectItem>
            <SelectItem value="rented">En location</SelectItem>
            <SelectItem value="maintenance">En maintenance</SelectItem>
            <SelectItem value="out_of_service">Hors service</SelectItem>
          </SelectContent>
        </Select>

        {userRole === 'direction' && (
          <Select value={selectedBase} onValueChange={onBaseChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Toutes les bases" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les bases</SelectItem>
              {bases.map((base) => (
                <SelectItem key={base.id} value={base.id}>
                  {base.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

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
              {selectedStatus === 'available' ? 'Disponible' : 
               selectedStatus === 'rented' ? 'En location' :
               selectedStatus === 'maintenance' ? 'En maintenance' : 'Hors service'}
              <button
                onClick={() => onStatusChange('all')}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedBase && selectedBase !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {bases.find(b => b.id === selectedBase)?.name}
              <button
                onClick={() => onBaseChange('all')}
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