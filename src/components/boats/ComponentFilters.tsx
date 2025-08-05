import React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export interface FilterState {
  search: string;
  status: string;
  componentType: string;
  maintenanceStatus: string;
}

interface ComponentFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  componentTypes: string[];
  totalCount: number;
  filteredCount: number;
}

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'operational', label: 'Opérationnel' },
  { value: 'maintenance_needed', label: 'Maintenance requise' },
  { value: 'out_of_service', label: 'Hors service' },
  { value: 'scheduled_maintenance', label: 'Maintenance planifiée' }
];

const maintenanceStatusOptions = [
  { value: '', label: 'Toutes les maintenances' },
  { value: 'overdue', label: 'Maintenance en retard' },
  { value: 'due_soon', label: 'Maintenance prochaine (30j)' },
  { value: 'up_to_date', label: 'Maintenance à jour' }
];

export function ComponentFilters({ 
  filters, 
  onFiltersChange, 
  componentTypes, 
  totalCount, 
  filteredCount 
}: ComponentFiltersProps) {
  const hasActiveFilters = filters.search || filters.status || filters.componentType || filters.maintenanceStatus;
  
  const resetFilters = () => {
    onFiltersChange({
      search: '',
      status: '',
      componentType: '',
      maintenanceStatus: ''
    });
  };

  const updateFilter = (key: keyof FilterState, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Search and reset */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un composant..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-10"
              />
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="px-3"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
          </div>

          {/* Filter selects */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.componentType} onValueChange={(value) => updateFilter('componentType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Type de composant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les types</SelectItem>
                {componentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.maintenanceStatus} onValueChange={(value) => updateFilter('maintenanceStatus', value)}>
              <SelectTrigger>
                <SelectValue placeholder="État maintenance" />
              </SelectTrigger>
              <SelectContent>
                {maintenanceStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Results count and active filters */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>
                {filteredCount} sur {totalCount} composant{totalCount > 1 ? 's' : ''}
                {hasActiveFilters && ' (filtré)'}
              </span>
            </div>
            
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-1">
                {filters.search && (
                  <Badge variant="secondary" className="text-xs">
                    Recherche: "{filters.search}"
                  </Badge>
                )}
                {filters.status && (
                  <Badge variant="secondary" className="text-xs">
                    Statut: {statusOptions.find(s => s.value === filters.status)?.label}
                  </Badge>
                )}
                {filters.componentType && (
                  <Badge variant="secondary" className="text-xs">
                    Type: {filters.componentType}
                  </Badge>
                )}
                {filters.maintenanceStatus && (
                  <Badge variant="secondary" className="text-xs">
                    Maintenance: {maintenanceStatusOptions.find(s => s.value === filters.maintenanceStatus)?.label}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}