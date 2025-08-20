import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { WidgetConfig, DashboardLayout } from '@/types/widget';
import { toast } from 'sonner';

export const useDashboardPreferences = () => {
  const { user } = useAuth();
  const [layout, setLayout] = useState<DashboardLayout>({ widgets: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadPreferences();
    }
  }, [user?.id]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('dashboard_preferences')
        .select('layout_config')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data?.layout_config && Array.isArray(data.layout_config)) {
        setLayout({ widgets: data.layout_config as unknown as WidgetConfig[] });
      } else {
        // Load default layout based on user role
        setLayout(getDefaultLayout(user?.role || 'technicien'));
      }
    } catch (error) {
      console.error('Error loading dashboard preferences:', error);
      setLayout(getDefaultLayout(user?.role || 'technicien'));
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newLayout: DashboardLayout) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('dashboard_preferences')
        .upsert({
          user_id: user.id,
          layout_config: newLayout.widgets as any,
        });

      if (error) throw error;
      
      setLayout(newLayout);
      toast.success('Tableau de bord sauvegardé');
    } catch (error) {
      console.error('Error saving dashboard preferences:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const addWidget = (widgetConfig: WidgetConfig) => {
    console.log('Adding widget to layout:', widgetConfig);
    const newLayout = {
      widgets: [...layout.widgets, widgetConfig],
    };
    console.log('New layout:', newLayout);
    savePreferences(newLayout);
  };

  const removeWidget = (widgetId: string) => {
    const newLayout = {
      widgets: layout.widgets.filter(w => w.id !== widgetId),
    };
    savePreferences(newLayout);
  };

  const updateWidget = (widgetId: string, updates: Partial<WidgetConfig>) => {
    const newLayout = {
      widgets: layout.widgets.map(w => 
        w.id === widgetId ? { ...w, ...updates } : w
      ),
    };
    savePreferences(newLayout);
  };

  const resetToDefault = () => {
    const defaultLayout = getDefaultLayout(user?.role || 'technicien');
    savePreferences(defaultLayout);
  };

  return {
    layout,
    loading,
    addWidget,
    removeWidget,
    updateWidget,
    resetToDefault,
    savePreferences,
  };
};

const getDefaultLayout = (role: string): DashboardLayout => {
  const baseWidgets: WidgetConfig[] = [
    {
      id: 'stats-1',
      type: 'statistics',
      title: 'Statistiques',
      size: 'medium',
      position: { x: 0, y: 0, w: 6, h: 3 },
    },
    {
      id: 'alerts-1',
      type: 'alerts',
      title: 'Alertes Récentes',
      size: 'medium',
      position: { x: 6, y: 0, w: 6, h: 3 },
    },
  ];

  if (role === 'direction') {
    baseWidgets.push({
      id: 'analytics-1',
      type: 'analytics',
      title: 'Analytiques Globales',
      size: 'large',
      position: { x: 0, y: 3, w: 12, h: 4 },
    });
  } else {
    baseWidgets.push({
      id: 'maintenance-1',
      type: 'maintenance',
      title: 'Maintenance à Venir',
      size: 'medium',
      position: { x: 0, y: 3, w: 6, h: 3 },
    });
    baseWidgets.push({
      id: 'actions-1',
      type: 'quick-actions',
      title: 'Actions Rapides',
      size: 'small',
      position: { x: 6, y: 3, w: 6, h: 3 },
    });
  }

  return { widgets: baseWidgets };
};