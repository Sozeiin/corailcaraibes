import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardData {
  interventions: any[];
  boats: any[];
  alerts: any[];
  bases: any[];
  orders: any[];
  preparations: any[];
  loading: boolean;
  error: string | null;
}

export const useDashboardData = (): DashboardData => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    interventions: [],
    boats: [],
    alerts: [],
    bases: [],
    orders: [],
    preparations: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    
    try {
      console.log('Loading dashboard data for user:', user.id, 'role:', user.role, 'baseId:', user.baseId);
      
      const promises = [];

      // Load interventions
      if (user.role === 'direction') {
        promises.push(supabase.from('interventions').select('*'));
      } else {
        promises.push(supabase.from('interventions').select('*').eq('base_id', user.baseId));
      }

      // Load boats
      if (user.role === 'direction') {
        promises.push(supabase.from('boats').select('*'));
      } else {
        promises.push(supabase.from('boats').select('*').eq('base_id', user.baseId));
      }

      // Load alerts
      if (user.role === 'direction') {
        promises.push(supabase.from('alerts').select('*'));
      } else {
        promises.push(supabase.from('alerts').select('*').or(`base_id.eq.${user.baseId},base_id.is.null`));
      }

      // Load bases
      if (user.role === 'direction') {
        promises.push(supabase.from('bases').select('*'));
      } else {
        promises.push(supabase.from('bases').select('*').eq('id', user.baseId));
      }

      // Load orders
      if (user.role === 'direction') {
        promises.push(supabase.from('orders').select('*'));
      } else {
        promises.push(supabase.from('orders').select('*').eq('base_id', user.baseId));
      }

      // Load preparation checklists for chef_base
      if (user.role === 'chef_base') {
        promises.push(
          supabase
            .from('boat_preparation_checklists')
            .select(`
              *,
              boats(name, model)
            `)
            .eq('boats.base_id', user.baseId)
        );
      } else if (user.role === 'direction') {
        promises.push(
          supabase
            .from('boat_preparation_checklists')
            .select(`
              *,
              boats(name, model)
            `)
        );
      } else {
        promises.push(Promise.resolve({ data: [] }));
      }

      const results = await Promise.all(promises);
      
      console.log('Dashboard data loaded:', {
        interventions: results[0]?.data?.length || 0,
        boats: results[1]?.data?.length || 0,
        alerts: results[2]?.data?.length || 0,
        bases: results[3]?.data?.length || 0,
        orders: results[4]?.data?.length || 0,
        preparations: results[5]?.data?.length || 0,
      });

      setData({
        interventions: results[0]?.data || [],
        boats: results[1]?.data || [],
        alerts: results[2]?.data || [],
        bases: results[3]?.data || [],
        orders: results[4]?.data || [],
        preparations: results[5]?.data || [],
        loading: false,
        error: null,
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur de chargement',
      }));
    }
  };

  return data;
};