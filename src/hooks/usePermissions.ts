import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PagePermission = 
  | 'dashboard'
  | 'boats'
  | 'safety_controls'
  | 'suppliers'
  | 'orders'
  | 'stock'
  | 'stock_scanner'
  | 'distribution'
  | 'maintenance'
  | 'maintenance_gantt'
  | 'maintenance_history'
  | 'maintenance_preventive'
  | 'notifications'
  | 'supply_requests'
  | 'boat_preparation';

export const PAGE_PERMISSIONS: Record<PagePermission, string> = {
  dashboard: 'Tableau de bord',
  boats: 'Bateaux',
  safety_controls: 'Contrôles de sécurité',
  suppliers: 'Fournisseurs',
  orders: 'Commandes',
  stock: 'Stock',
  stock_scanner: 'Scanner stock',
  distribution: 'Distribution',
  maintenance: 'Maintenance',
  maintenance_gantt: 'Planning Gantt',
  maintenance_history: 'Historique maintenance',
  maintenance_preventive: 'Maintenance préventive',
  notifications: 'Notifications',
  supply_requests: 'Demandes approvisionnement',
  boat_preparation: 'Préparation des bateaux'
};

export function usePermissions() {
  const { user } = useAuth();

  const { data: permissions = {}, isLoading } = useQuery({
    queryKey: ['permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      
      const { data } = await supabase.rpc('get_user_page_permissions', {
        user_id_param: user.id
      });
      
      const permissionsMap: Record<PagePermission, boolean> = {} as Record<PagePermission, boolean>;
      
      if (data) {
        data.forEach((perm: { page_permission: PagePermission; granted: boolean }) => {
          permissionsMap[perm.page_permission] = perm.granted;
        });
      }
      
      return permissionsMap;
    },
    enabled: !!user?.id
  });

  const hasPermission = (page: PagePermission): boolean => {
    // Direction, chef_base and administratif always have access
    if (user?.role === 'direction' || user?.role === 'chef_base' || user?.role === 'administratif') {
      return true;
    }
    
    // For technicians, check permissions (default to true if not set)
    return permissions[page] !== false;
  };

  const checkPagePermission = async (page: PagePermission): Promise<boolean> => {
    if (!user?.id) return false;
    
    const { data } = await supabase.rpc('has_page_permission', {
      user_id_param: user.id,
      page_param: page
    });
    
    return data || false;
  };

  return {
    permissions,
    hasPermission,
    checkPagePermission,
    isLoading
  };
}