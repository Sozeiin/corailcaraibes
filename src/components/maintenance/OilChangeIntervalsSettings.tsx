import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Gauge, Ship, Save } from 'lucide-react';
import { useUpdateOilChangeInterval } from '@/hooks/useOilChangeIntervalMutations';
import { DEFAULT_OIL_CHANGE_INTERVAL } from '@/utils/engineMaintenanceUtils';

interface IntervalComponent {
  id: string;
  component_name: string;
  component_type: string | null;
  oil_change_interval_hours: number | null;
  boat_id: string;
  boats: { id: string; name: string } | null;
}

export function OilChangeIntervalsSettings() {
  const updateInterval = useUpdateOilChangeInterval();
  const [values, setValues] = useState<Record<string, string>>({});

  const { data: components = [], isLoading } = useQuery({
    queryKey: ['oil-change-intervals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boat_components')
        .select('id, component_name, component_type, oil_change_interval_hours, boat_id, boats(id, name)')
        .or('component_type.ilike.%moteur%,component_type.ilike.%générateur%,component_type.ilike.%generateur%,component_type.ilike.%generator%,component_type.ilike.%engine%')
        .order('component_name');

      if (error) throw error;
      return (data || []) as unknown as IntervalComponent[];
    },
  });

  useEffect(() => {
    const initial: Record<string, string> = {};
    components.forEach((c) => {
      initial[c.id] = String(c.oil_change_interval_hours ?? DEFAULT_OIL_CHANGE_INTERVAL);
    });
    setValues(initial);
  }, [components]);

  const grouped = useMemo(() => {
    const map = new Map<string, { boatName: string; items: IntervalComponent[] }>();
    components.forEach((c) => {
      const key = c.boat_id;
      const boatName = c.boats?.name || 'Bateau inconnu';
      if (!map.has(key)) map.set(key, { boatName, items: [] });
      map.get(key)!.items.push(c);
    });
    return Array.from(map.values()).sort((a, b) => a.boatName.localeCompare(b.boatName));
  }, [components]);

  const handleSave = (component: IntervalComponent) => {
    const raw = values[component.id];
    const interval = parseInt(raw, 10);
    if (isNaN(interval) || interval <= 0) return;
    updateInterval.mutate({ componentId: component.id, interval });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          Intervalles de vidange (heures moteur)
        </CardTitle>
        <CardDescription>
          Définissez l'intervalle d'heures avant vidange pour chaque moteur et génératrice. L'alerte « bientôt » se déclenche à 80 % de l'intervalle.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun moteur ou génératrice configuré sur la flotte.</p>
        ) : (
          grouped.map((group) => (
            <div key={group.boatName} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2 font-medium">
                <Ship className="h-4 w-4 text-primary" />
                {group.boatName}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {group.items.map((component) => {
                  const dirty = values[component.id] !== String(component.oil_change_interval_hours ?? DEFAULT_OIL_CHANGE_INTERVAL);
                  return (
                    <div key={component.id} className="space-y-2 rounded-md border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor={`interval-${component.id}`} className="text-sm font-medium">
                          {component.component_name}
                        </Label>
                        {component.component_type && (
                          <Badge variant="outline" className="text-xs font-normal">
                            {component.component_type}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            id={`interval-${component.id}`}
                            type="number"
                            min={1}
                            step={10}
                            value={values[component.id] ?? ''}
                            onChange={(e) =>
                              setValues((prev) => ({ ...prev, [component.id]: e.target.value }))
                            }
                            className="pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            h
                          </span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSave(component)}
                          disabled={!dirty || updateInterval.isPending}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
