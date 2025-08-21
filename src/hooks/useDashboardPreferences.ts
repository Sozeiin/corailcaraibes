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
    console.log('useDashboardPreferences - User changed:', user?.id);
    if (user?.id) {
      loadPreferences();
    } else {
      console.log('useDashboardPreferences - No user, setting default layout');
      setLayout(getDefaultLayout('technicien'));
      setLoading(false);
    }
  }, [user?.id]);

  // Fonction pour forcer le rechargement 
  const refetchPreferences = () => {
    if (user?.id) {
      console.log('Manually refetching preferences');
      loadPreferences();
    }
  };

  const loadPreferences = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      console.log('Loading preferences for user:', user.id);
      
      const { data, error } = await supabase
        .from('dashboard_preferences')
        .select('layout_config')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading dashboard preferences:', error);
        throw error;
      }

      console.log('Loaded data:', data);

      if (data?.layout_config && Array.isArray(data.layout_config)) {
        const loadedLayout = { widgets: data.layout_config as unknown as WidgetConfig[] };
        console.log('Setting loaded layout:', loadedLayout);
        setLayout(loadedLayout);
      } else {
        // Load default layout based on user role
        console.log('Loading default layout for role:', user?.role);
        const defaultLayout = getDefaultLayout(user?.role || 'technicien');
        setLayout(defaultLayout);
      }
    } catch (error) {
      console.error('Error loading dashboard preferences:', error);
      setLayout(getDefaultLayout(user?.role || 'technicien'));
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newLayout: DashboardLayout) => {
    if (!user?.id) {
      console.warn('No user ID, cannot save preferences');
      return;
    }

    try {
      console.log('Starting save preferences for user:', user.id);
      console.log('Layout to save:', JSON.stringify(newLayout, null, 2));
      
      // Optimistic update - Update local state immediately
      setLayout(newLayout);
      
      // Prepare data for Supabase
      const saveData = {
        user_id: user.id,
        layout_config: newLayout.widgets as any, // Cast to match Json type
        updated_at: new Date().toISOString(),
      };
      
      console.log('Data being sent to Supabase:', JSON.stringify(saveData, null, 2));
      
      const { data, error } = await supabase
        .from('dashboard_preferences')
        .upsert(saveData);

      if (error) {
        console.error('Supabase error details:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error hint:', error.hint);
        // Revert optimistic update on error
        throw error;
      }
      
      console.log('Preferences saved successfully to database');
      console.log('Supabase response data:', data);
      
    } catch (error: any) {
      console.error('Full error object:', error);
      console.error('Error saving dashboard preferences:', error);
      toast.error('Erreur lors de la sauvegarde: ' + (error?.message || 'Erreur inconnue'));
      // Re-throw to handle in calling function
      throw error;
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
    refetchPreferences,
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