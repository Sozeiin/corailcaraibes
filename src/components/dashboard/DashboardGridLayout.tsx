import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDashboardPreferences } from '@/hooks/useDashboardPreferences';
import { getWidgetByType } from './widgets';
import { WidgetConfig } from '@/types/widget';
import { Settings, Plus, X, RotateCcw, Loader2 } from 'lucide-react';
import { DashboardCustomizer } from './DashboardCustomizer';
import { toast } from 'sonner';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './DashboardGridLayout.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

export const DashboardGridLayout = () => {
  const { layout, loading, removeWidget, updateWidget, savePreferences, resetToDefault } = useDashboardPreferences();
  const [isEditing, setIsEditing] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingLayoutRef = useRef<any>(null);

  // Convert our widgets to grid layout format
  const gridLayouts = useMemo(() => {
    const layoutData = layout.widgets.map((widget) => ({
      i: widget.id,
      x: widget.position?.x || 0,
      y: widget.position?.y || 0,
      w: widget.position?.w || getSizeConfig(widget.size).w,
      h: widget.position?.h || getSizeConfig(widget.size).h,
      minW: 2,
      minH: 2,
    }));

    return {
      lg: layoutData,
      md: layoutData,
      sm: layoutData.map(item => ({ ...item, w: Math.min(item.w, 6) })),
      xs: layoutData.map(item => ({ ...item, w: 4, x: 0 })),
    };
  }, [layout.widgets]);

  const handleLayoutChange = useCallback((currentLayout: any, layouts: any) => {
    console.log('Layout changed, isEditing:', isEditing, 'currentLayout:', currentLayout);

    // Sauvegarder seulement en mode édition
    if (!isEditing) {
      console.log('Not in editing mode, skipping save');
      return;
    }

    // Store the pending layout for immediate save on edit mode exit
    pendingLayoutRef.current = currentLayout;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save operation
    saveTimeoutRef.current = setTimeout(() => {
      saveLayoutFromGrid(currentLayout);
    }, 300); // Réduit à 300ms pour plus de réactivité
  }, [isEditing, layout.widgets, savePreferences]);

  const saveLayoutFromGrid = useCallback(async (currentLayout: any) => {
    if (!currentLayout) {
      console.log('No layout to save');
      return;
    }

    try {
      console.log('Starting saveLayoutFromGrid with:', currentLayout);
      setIsSaving(true);
      
      const updatedWidgets = layout.widgets.map(widget => {
        const layoutItem = currentLayout.find((item: any) => item.i === widget.id);
        if (layoutItem) {
          console.log(`Updating widget ${widget.id}:`, {
            from: widget.position,
            to: {
              x: layoutItem.x,
              y: layoutItem.y,
              w: layoutItem.w,
              h: layoutItem.h,
            }
          });
          return {
            ...widget,
            position: {
              x: layoutItem.x,
              y: layoutItem.y,
              w: layoutItem.w,
              h: layoutItem.h,
            }
          };
        }
        return widget;
      });

      const newLayout = { widgets: updatedWidgets };
      console.log('Attempting to save new layout:', newLayout);
      
      await savePreferences(newLayout);
      
      console.log('Layout saved successfully');
      toast.success('Position des widgets sauvegardée');
      
    } catch (error: any) {
      console.error('Error in saveLayoutFromGrid:', error);
      toast.error('Erreur lors de la sauvegarde: ' + (error?.message || 'Erreur inconnue'));
    } finally {
      setIsSaving(false);
    }
  }, [layout.widgets, savePreferences]);

  // Cleanup timeout on unmount and force save if needed
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Force save any pending changes before unmount
      if (pendingLayoutRef.current && isEditing) {
        saveLayoutFromGrid(pendingLayoutRef.current);
      }
    };
  }, [isEditing, saveLayoutFromGrid]);

  // Handle page visibility change to save before navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingLayoutRef.current && isEditing) {
        // Force synchronous save before page unload
        navigator.sendBeacon('/api/save-layout', JSON.stringify(pendingLayoutRef.current));
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && pendingLayoutRef.current && isEditing) {
        saveLayoutFromGrid(pendingLayoutRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isEditing, saveLayoutFromGrid]);
  
  // Debug logs pour tracer les changements
  useEffect(() => {
    console.log('DashboardGridLayout - Layout changed:', layout);
  }, [layout]);

  useEffect(() => {
    console.log('DashboardGridLayout - Loading state:', loading);
  }, [loading]);

  const handleRemoveWidget = (widgetId: string) => {
    removeWidget(widgetId);
    toast.success('Widget supprimé');
  };

  const renderWidget = (widget: WidgetConfig) => {
    const widgetType = getWidgetByType(widget.type);
    if (!widgetType) return null;

    const WidgetComponent = widgetType.component;

    return (
      <div key={widget.id} className="relative">
        {isEditing && (
          <div className="absolute top-2 right-2 z-10 flex space-x-1">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleRemoveWidget(widget.id)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div className={`h-full w-full overflow-hidden ${isEditing ? 'editing' : ''}`}>
          <WidgetComponent
            config={widget}
            isEditing={isEditing}
            onConfigChange={(newConfig) => updateWidget(widget.id, newConfig)}
            onRemove={() => handleRemoveWidget(widget.id)}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-64 animate-pulse bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold">Mon Tableau de Bord</h2>
          <Badge variant="secondary" className="text-xs">
            {layout.widgets.length} widget(s)
          </Badge>
          {isEditing && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
              Mode édition - Glissez pour repositionner
            </Badge>
          )}
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
            variant="outline"
            size="sm"
            onClick={resetToDefault}
            title="Remettre à zéro"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            disabled={isSaving}
            onClick={async () => {
              if (isEditing) {
                // Force save before exiting edit mode
                if (saveTimeoutRef.current) {
                  clearTimeout(saveTimeoutRef.current);
                }
                if (pendingLayoutRef.current) {
                  await saveLayoutFromGrid(pendingLayoutRef.current);
                  pendingLayoutRef.current = null;
                }
                toast.success('Modifications sauvegardées');
              } else {
                toast.info('Mode édition activé - Glissez les widgets pour les repositionner');
              }
              setIsEditing(!isEditing);
            }}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Settings className="h-4 w-4 mr-1" />
            )}
            {isEditing ? 'Terminer' : 'Personnaliser'}
          </Button>
        </div>
      </div>

      {/* Widgets Grid */}
      {layout.widgets.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
          <div className="space-y-4">
            <div className="text-muted-foreground">
              <Plus className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              Aucun widget configuré
            </div>
            <Button onClick={() => setShowCustomizer(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter votre premier widget
            </Button>
          </div>
        </div>
      ) : (
        <ResponsiveGridLayout
          layouts={gridLayouts}
          onLayoutChange={handleLayoutChange}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
          rowHeight={60}
          isDraggable={isEditing}
          isResizable={isEditing}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        >
          {layout.widgets.map(renderWidget)}
        </ResponsiveGridLayout>
      )}

      {/* Customizer Modal */}
      <DashboardCustomizer
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
      />
    </div>
  );
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