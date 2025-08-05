import React, { useState } from 'react';
import { Grid, List, Table, Calendar, History, Settings, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useBoatComponents } from './BoatComponentsContext';
import { ComponentDetailsView } from './ComponentDetailsView';
import type { BoatComponent } from '@/types';

type ViewMode = 'grid' | 'list' | 'table';

interface ViewModeSelectorProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function ViewModeSelector({ currentView, onViewChange }: ViewModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 border rounded-lg p-1">
      <Button
        variant={currentView === 'grid' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('grid')}
        className="px-3"
      >
        <Grid className="h-4 w-4" />
      </Button>
      <Button
        variant={currentView === 'list' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('list')}
        className="px-3"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={currentView === 'table' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('table')}
        className="px-3"
      >
        <Table className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface AdvancedViewsProps {
  onAddNew: () => void;
}

export function AdvancedViews({ onAddNew }: AdvancedViewsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedComponent, setSelectedComponent] = useState<BoatComponent | null>(null);
  const { components, filteredComponents } = useBoatComponents();

  if (selectedComponent) {
    return (
      <ComponentDetailsView 
        component={selectedComponent} 
        onClose={() => setSelectedComponent(null)} 
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with view selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">
            {filteredComponents.length} composant{filteredComponents.length > 1 ? 's' : ''}
          </h3>
          <ViewModeSelector currentView={viewMode} onViewChange={setViewMode} />
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // TODO: Implement history view navigation
              console.log('Navigating to history view');
            }}
          >
            <History className="h-4 w-4 mr-2" />
            Historique
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // TODO: Implement planning view navigation  
              console.log('Navigating to planning view');
            }}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Planification
          </Button>
        </div>
      </div>

      {/* Content based on view mode */}
      <div className="min-h-[400px]">
        {viewMode === 'grid' && <GridView onAddNew={onAddNew} onComponentClick={setSelectedComponent} />}
        {viewMode === 'list' && <ListView onAddNew={onAddNew} onComponentClick={setSelectedComponent} />}
        {viewMode === 'table' && <TableView onAddNew={onAddNew} onComponentClick={setSelectedComponent} />}
      </div>
    </div>
  );
}

function GridView({ onAddNew, onComponentClick }: { onAddNew: () => void; onComponentClick: (component: BoatComponent) => void }) {
  const { filteredComponents } = useBoatComponents();

  if (filteredComponents.length === 0) {
    return <EmptyStateWithAction onAddNew={onAddNew} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredComponents.map((component) => (
        <ComponentGridCard key={component.id} component={component} onComponentClick={onComponentClick} />
      ))}
    </div>
  );
}

function ListView({ onAddNew, onComponentClick }: { onAddNew: () => void; onComponentClick: (component: BoatComponent) => void }) {
  const { filteredComponents } = useBoatComponents();

  if (filteredComponents.length === 0) {
    return <EmptyStateWithAction onAddNew={onAddNew} />;
  }

  return (
    <div className="space-y-2">
      {filteredComponents.map((component) => (
        <ComponentListItem key={component.id} component={component} onComponentClick={onComponentClick} />
      ))}
    </div>
  );
}

function TableView({ onAddNew, onComponentClick }: { onAddNew: () => void; onComponentClick: (component: BoatComponent) => void }) {
  const { filteredComponents } = useBoatComponents();

  if (filteredComponents.length === 0) {
    return <EmptyStateWithAction onAddNew={onAddNew} />;
  }

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium">Nom</th>
            <th className="text-left p-3 font-medium">Type</th>
            <th className="text-left p-3 font-medium">Statut</th>
            <th className="text-left p-3 font-medium">Fabricant</th>
            <th className="text-left p-3 font-medium">Modèle</th>
            <th className="text-left p-3 font-medium">Maintenance</th>
            <th className="text-left p-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredComponents.map((component) => (
            <ComponentTableRow key={component.id} component={component} onComponentClick={onComponentClick} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComponentGridCard({ component, onComponentClick }: { component: any; onComponentClick: (component: BoatComponent) => void }) {
  const { handleEdit, deleteComponentMutation } = useBoatComponents();
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h4 className="font-medium">{component.componentName}</h4>
            <p className="text-sm text-muted-foreground">{component.componentType}</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{component.status}</Badge>
            {component.manufacturer && (
              <Badge variant="outline">{component.manufacturer}</Badge>
            )}
          </div>
          
          <div className="text-xs space-y-1">
            {component.model && (
              <div><span className="font-medium">Modèle:</span> {component.model}</div>
            )}
            <div><span className="font-medium">Maintenance:</span> tous les {component.maintenanceIntervalDays} jours</div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onComponentClick(component)}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              Voir détails
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(component)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComponentListItem({ component, onComponentClick }: { component: any; onComponentClick: (component: BoatComponent) => void }) {
  const { handleEdit } = useBoatComponents();
  
  return (
    <Card className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => onComponentClick(component)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h4 className="font-medium">{component.componentName}</h4>
              <p className="text-sm text-muted-foreground">{component.componentType}</p>
            </div>
            <Badge variant="secondary">{component.status}</Badge>
            {component.manufacturer && (
              <span className="text-sm text-muted-foreground">{component.manufacturer}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(component);
              }}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComponentTableRow({ component, onComponentClick }: { component: any; onComponentClick: (component: BoatComponent) => void }) {
  const { handleEdit } = useBoatComponents();
  
  return (
    <tr className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => onComponentClick(component)}>
      <td className="p-3 font-medium">{component.componentName}</td>
      <td className="p-3">{component.componentType}</td>
      <td className="p-3">
        <Badge variant="secondary">{component.status}</Badge>
      </td>
      <td className="p-3">{component.manufacturer || '-'}</td>
      <td className="p-3">{component.model || '-'}</td>
      <td className="p-3">{component.maintenanceIntervalDays} jours</td>
      <td className="p-3">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onComponentClick(component);
            }}
            title="Voir détails"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(component);
            }}
            title="Modifier"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function EmptyStateWithAction({ onAddNew }: { onAddNew: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="max-w-md mx-auto">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Settings className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">Aucun composant trouvé</h3>
        <p className="text-muted-foreground mt-2 mb-4">
          Commencez par ajouter un composant à ce bateau ou ajustez vos filtres.
        </p>
        <Button onClick={onAddNew}>
          Ajouter un composant
        </Button>
      </div>
    </div>
  );
}