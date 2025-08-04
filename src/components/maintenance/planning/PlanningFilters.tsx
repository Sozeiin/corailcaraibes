import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter, X, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface PlanningFilters {
  search: string;
  technician: string;
  activityType: string;
  status: string;
  priority: string;
  dateRange: {
    from?: Date;
    to?: Date;
  };
  boat: string;
}

interface PlanningFiltersProps {
  filters: PlanningFilters;
  onFiltersChange: (filters: PlanningFilters) => void;
  technicians: Array<{ id: string; name: string }>;
  boats: Array<{ id: string; name: string }>;
  onReset: () => void;
}

export function PlanningFilters({ 
  filters, 
  onFiltersChange, 
  technicians, 
  boats, 
  onReset 
}: PlanningFiltersProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const updateFilter = (key: keyof PlanningFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = Object.values(filters).some(value => {
    if (typeof value === 'string') return value !== '';
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(v => v !== undefined && v !== '');
    }
    return false;
  });

  const activeFilterCount = [
    filters.search,
    filters.technician,
    filters.activityType,
    filters.status,
    filters.priority,
    filters.boat,
    filters.dateRange.from || filters.dateRange.to ? 'dateRange' : ''
  ].filter(Boolean).length;

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtres
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Search */}
            <div>
              <Label htmlFor="search">Recherche</Label>
              <Input
                id="search"
                placeholder="Rechercher une activité..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
              />
            </div>

            {/* Quick filters grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Technician */}
              <div>
                <Label>Technicien</Label>
                <Select value={filters.technician} onValueChange={(value) => updateFilter('technician', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les techniciens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous les techniciens</SelectItem>
                    {technicians.map(tech => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Activity Type */}
              <div>
                <Label>Type d'activité</Label>
                <Select value={filters.activityType} onValueChange={(value) => updateFilter('activityType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous les types</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="checkin">Check-in</SelectItem>
                    <SelectItem value="checkout">Check-out</SelectItem>
                    <SelectItem value="travel">Déplacement</SelectItem>
                    <SelectItem value="break">Pause</SelectItem>
                    <SelectItem value="emergency">Urgence</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div>
                <Label>Statut</Label>
                <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous les statuts</SelectItem>
                    <SelectItem value="planned">Planifié</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="completed">Terminé</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                    <SelectItem value="overdue">En retard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <Label>Priorité</Label>
                <Select value={filters.priority} onValueChange={(value) => updateFilter('priority', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les priorités" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Toutes les priorités</SelectItem>
                    <SelectItem value="low">Faible</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Élevée</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Boat */}
              <div>
                <Label>Bateau</Label>
                <Select value={filters.boat} onValueChange={(value) => updateFilter('boat', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les bateaux" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous les bateaux</SelectItem>
                    {boats.map(boat => (
                      <SelectItem key={boat.id} value={boat.id}>
                        {boat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div>
                <Label>Période</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.from ? (
                        filters.dateRange.to ? (
                          <>
                            {format(filters.dateRange.from, "LLL dd, y", { locale: fr })} -{" "}
                            {format(filters.dateRange.to, "LLL dd, y", { locale: fr })}
                          </>
                        ) : (
                          format(filters.dateRange.from, "LLL dd, y", { locale: fr })
                        )
                      ) : (
                        <span>Sélectionner une période</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={filters.dateRange.from}
                      selected={filters.dateRange.from && filters.dateRange.to ? 
                        { from: filters.dateRange.from, to: filters.dateRange.to } : 
                        undefined
                      }
                      onSelect={(range) => updateFilter('dateRange', range || { from: undefined, to: undefined })}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Reset button */}
            {hasActiveFilters && (
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={onReset}>
                  <X className="w-4 h-4 mr-2" />
                  Réinitialiser les filtres
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}