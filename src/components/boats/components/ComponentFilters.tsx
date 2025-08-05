import React, { useState } from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FilterState {
  search: string;
  status: string;
  componentType: string;
  sortBy: string;
}

interface ComponentFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  totalCount: number;
  filteredCount: number;
}

const statusOptions = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'operational', label: 'Opérationnel' },
  { value: 'maintenance_needed', label: 'Maintenance requise' },
  { value: 'out_of_service', label: 'Hors service' },
  { value: 'scheduled_maintenance', label: 'Maintenance planifiée' }
];

const componentTypeOptions = [
  { value: 'all', label: 'Tous les types' },
  { value: 'Moteur bâbord', label: 'Moteur bâbord' },
  { value: 'Moteur tribord', label: 'Moteur tribord' },
  { value: 'Générateur', label: 'Générateur' },
  { value: 'Système hydraulique', label: 'Système hydraulique' },
  { value: 'Système électrique', label: 'Système électrique' },
  { value: 'Système de navigation', label: 'Système de navigation' },
  { value: 'Pompe de cale', label: 'Pompe de cale' },
  { value: 'Climatisation', label: 'Climatisation' },
  { value: 'Système de carburant', label: 'Système de carburant' },
  { value: 'Gouvernail', label: 'Gouvernail' },
  { value: 'Propulseur d\'étrave', label: 'Propulseur d\'étrave' },
  { value: 'Winch', label: 'Winch' },
  { value: 'Gréement', label: 'Gréement' },
  { value: 'Autre', label: 'Autre' }
];

const sortOptions = [
  { value: 'name', label: 'Nom (A-Z)' },
  { value: 'name_desc', label: 'Nom (Z-A)' },
  { value: 'type', label: 'Type' },
  { value: 'status', label: 'Statut' },
  { value: 'maintenance', label: 'Maintenance' }
];

export function ComponentFilters({ filters, onFiltersChange, totalCount, filteredCount }: ComponentFiltersProps) {
  console.log('ComponentFilters rendered with:', { filters, totalCount, filteredCount });

  const updateFilter = (key: keyof FilterState, value: string) => {
    console.log(`Updating filter ${key} to:`, value);
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
  };

  const resetFilters = () => {
    console.log('Resetting all filters');
    const defaultFilters: FilterState = {
      search: '',
      status: 'all',
      componentType: 'all',
      sortBy: 'name'
    };
    onFiltersChange(defaultFilters);
  };

  const hasActiveFilters = filters.search || (filters.status && filters.status !== 'all') || (filters.componentType && filters.componentType !== 'all');

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher un composant..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
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
            </div>

            <div>
              <Select value={filters.componentType} onValueChange={(value) => updateFilter('componentType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Type de composant" />
                </SelectTrigger>
                <SelectContent>
                  {componentTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Réinitialiser
              </Button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {filteredCount} / {totalCount} composant{totalCount > 1 ? 's' : ''}
              </span>
              {hasActiveFilters && (
                <Badge variant="secondary" className="text-xs">
                  Filtré
                </Badge>
              )}
            </div>
            
            {hasActiveFilters && (
              <div className="flex items-center gap-2 text-xs">
                {filters.search && (
                  <Badge variant="outline">
                    Recherche: "{filters.search}"
                  </Badge>
                )}
                {filters.status && filters.status !== 'all' && (
                  <Badge variant="outline">
                    Statut: {statusOptions.find(s => s.value === filters.status)?.label}
                  </Badge>
                )}
                {filters.componentType && filters.componentType !== 'all' && (
                  <Badge variant="outline">
                    Type: {componentTypeOptions.find(t => t.value === filters.componentType)?.label}
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

export type { FilterState };