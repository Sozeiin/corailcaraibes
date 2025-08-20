import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboardPreferences } from '@/hooks/useDashboardPreferences';
import { getWidgetByType } from './widgets';
import { WidgetConfig } from '@/types/widget';
import { Settings, Plus, X } from 'lucide-react';
import { DashboardCustomizer } from './DashboardCustomizer';

export const DashboardGrid = () => {
  const { layout, loading, removeWidget, updateWidget } = useDashboardPreferences();
  const [isEditing, setIsEditing] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="h-64 animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  const renderWidget = (config: WidgetConfig) => {
    const widget = getWidgetByType(config.type);
    if (!widget) return null;

    const WidgetComponent = widget.component;

    return (
      <div
        key={config.id}
        className={`relative ${getSizeClasses(config.size)}`}
      >
        {isEditing && (
          <div className="absolute top-2 right-2 z-10 flex space-x-1">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => removeWidget(config.id)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        <WidgetComponent
          config={config}
          isEditing={isEditing}
          onConfigChange={(newConfig) => updateWidget(config.id, newConfig)}
          onRemove={() => removeWidget(config.id)}
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold">Mon Tableau de Bord</h2>
          <Badge variant="secondary" className="text-xs">
            {layout.widgets.length} widget(s)
          </Badge>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomizer(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Settings className="h-4 w-4 mr-1" />
            {isEditing ? 'Terminer' : 'Personnaliser'}
          </Button>
        </div>
      </div>

      {/* Widgets Grid */}
      {layout.widgets.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="space-y-4">
            <div className="text-muted-foreground">
              Aucun widget configuré
            </div>
            <Button onClick={() => setShowCustomizer(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter votre premier widget
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {layout.widgets.map(renderWidget)}
        </div>
      )}

      {/* Customizer Modal */}
      <DashboardCustomizer
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
      />
    </div>
  );
};

const getSizeClasses = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small':
      return 'col-span-1 h-64';
    case 'medium':
      return 'col-span-1 md:col-span-2 h-64';
    case 'large':
      return 'col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 h-80';
    default:
      return 'col-span-1 h-64';
  }
};