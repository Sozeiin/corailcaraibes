import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Settings, Plus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BoatComponent } from '@/types';
import type { BoatSubComponent } from '@/types/component';

interface BoatTreeViewProps {
  components: BoatComponent[];
  onComponentEdit: (component: BoatComponent) => void;
  onComponentDetails: (component: BoatComponent) => void;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'operational':
      return 'default';
    case 'maintenance_needed':
      return 'secondary';
    case 'out_of_service':
      return 'destructive';
    case 'scheduled_maintenance':
      return 'outline';
    default:
      return 'secondary';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'operational':
      return 'Opérationnel';
    case 'maintenance_needed':
      return 'Maintenance requise';
    case 'out_of_service':
      return 'Hors service';
    case 'scheduled_maintenance':
      return 'Maintenance planifiée';
    default:
      return status;
  }
};

interface ComponentNodeProps {
  component: BoatComponent;
  onEdit: (component: BoatComponent) => void;
  onDetails: (component: BoatComponent) => void;
}

function ComponentNode({ component, onEdit, onDetails }: ComponentNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: subComponents = [] } = useQuery({
    queryKey: ['sub-components', component.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boat_sub_components')
        .select('*')
        .eq('parent_component_id', component.id)
        .order('sub_component_name');

      if (error) throw error;
      return data as BoatSubComponent[];
    },
    enabled: isExpanded
  });

  const hasSubComponents = subComponents.length > 0;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="p-4 bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {hasSubComponents && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              )}
              {!hasSubComponents && <div className="w-6" />}
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-base">{component.componentName}</h4>
                  <Badge variant={getStatusBadgeVariant(component.status)} className="text-xs">
                    {getStatusLabel(component.status)}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{component.componentType}</p>
                  {component.manufacturer && (
                    <p>
                      <span className="font-medium">Fabricant:</span> {component.manufacturer}
                      {component.model && ` - ${component.model}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDetails(component)}
                className="h-8 w-8 p-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(component)}
                className="h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {hasSubComponents && (
          <CollapsibleContent>
            <div className="border-t border-border bg-muted/30">
              <div className="p-4 space-y-3">
                <h5 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Plus className="h-3 w-3" />
                  Sous-composants ({subComponents.length})
                </h5>
                <div className="space-y-2 pl-6">
                  {subComponents.map((subComponent) => (
                    <div
                      key={subComponent.id}
                      className="flex items-center justify-between p-3 bg-card rounded border border-border/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{subComponent.sub_component_name}</span>
                          <Badge variant={getStatusBadgeVariant(subComponent.status)} className="text-xs">
                            {getStatusLabel(subComponent.status)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {subComponent.sub_component_type && (
                            <span>{subComponent.sub_component_type}</span>
                          )}
                          {subComponent.manufacturer && (
                            <span className="ml-2">• {subComponent.manufacturer}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

export function BoatTreeView({ components, onComponentEdit, onComponentDetails }: BoatTreeViewProps) {
  // Group components by type for better organization
  const groupedComponents = components.reduce((acc, component) => {
    const type = component.componentType;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(component);
    return acc;
  }, {} as Record<string, BoatComponent[]>);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {Object.entries(groupedComponents).map(([type, typeComponents]) => (
            <div key={type} className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <h3 className="font-semibold text-lg text-primary">{type}</h3>
                <Badge variant="outline" className="text-xs">
                  {typeComponents.length} composant{typeComponents.length > 1 ? 's' : ''}
                </Badge>
              </div>
              
              <div className="space-y-3 animate-fade-in">
                {typeComponents.map((component) => (
                  <ComponentNode
                    key={component.id}
                    component={component}
                    onEdit={onComponentEdit}
                    onDetails={onComponentDetails}
                  />
                ))}
              </div>
            </div>
          ))}
          
          {components.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun composant configuré</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}