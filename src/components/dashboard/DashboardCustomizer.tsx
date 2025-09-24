import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboardPreferences } from '@/hooks/useDashboardPreferences';
import { getWidgetsForRole } from './widgets';
import { useAuth } from '@/contexts/AuthContext';
import { WidgetConfig } from '@/types/widget';
import { Plus, RotateCcw } from 'lucide-react';
import * as Icons from 'lucide-react';

interface DashboardCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DashboardCustomizer = ({ isOpen, onClose }: DashboardCustomizerProps) => {
  const { user } = useAuth();
  const { layout, addWidget, resetToDefault } = useDashboardPreferences();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const availableWidgets = getWidgetsForRole(user?.role || 'technicien');
  
  const categories = [
    { id: 'all', label: 'Tous' },
    { id: 'statistics', label: 'Statistiques' },
    { id: 'alerts', label: 'Alertes' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'actions', label: 'Actions' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'operations', label: 'Opérations' },
  ];

  const filteredWidgets = availableWidgets.filter(widget => 
    selectedCategory === 'all' || widget.category === selectedCategory
  );

  const isWidgetAdded = (widgetType: string) => {
    return layout.widgets.some(w => w.type === widgetType);
  };

  const getSizeConfig = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small':
        return { w: 3, h: 4 };
      case 'medium':
        return { w: 6, h: 4 };
      case 'large':
        return { w: 12, h: 6 };
      default:
        return { w: 6, h: 4 };
    }
  };

  const handleAddWidget = async (widgetType: string) => {
    const widget = availableWidgets.find(w => w.type === widgetType);
    if (!widget) return;

    const newWidget: WidgetConfig = {
      id: `${widgetType}-${Date.now()}`,
      type: widgetType,
      title: widget.title,
      size: widget.defaultSize,
      position: { 
        x: 0, 
        y: 0, 
        w: getSizeConfig(widget.defaultSize).w, 
        h: getSizeConfig(widget.defaultSize).h 
      },
    };

    try {
      await addWidget(newWidget);
      console.log('Widget added successfully:', newWidget);
    } catch (error) {
      console.error('Failed to add widget:', error);
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || Icons.Square;
    return IconComponent;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personnaliser le Tableau de Bord</DialogTitle>
          <DialogDescription>
            Ajoutez et organisez vos widgets selon vos besoins.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWidgets.map(widget => {
              const Icon = getIcon(widget.icon);
              const isAdded = isWidgetAdded(widget.type);
              
              return (
                <Card key={widget.id} className={isAdded ? 'opacity-50' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Icon className="h-5 w-5 text-primary" />
                      <Badge variant="outline" className="text-xs">
                        {widget.defaultSize}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm">{widget.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {widget.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={isAdded}
                      onClick={() => handleAddWidget(widget.type)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {isAdded ? 'Déjà ajouté' : 'Ajouter'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Reset Option */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Configuration par défaut</h3>
                <p className="text-xs text-muted-foreground">
                  Remettre le tableau de bord à sa configuration d'origine
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={resetToDefault}>
                <RotateCcw className="h-3 w-3 mr-1" />
                Réinitialiser
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};