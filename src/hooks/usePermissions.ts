import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PagePermission = 
  | 'dashboard'
  | 'boats'
  | 'boats_dashboard'
  | 'boats_fleet'
  | 'boats_safety_controls'
  | 'safety_controls'
  | 'suppliers'
  | 'orders'
  | 'stock'
  | 'stock_inventory'
  | 'stock_scanner'
  | 'stock_shipments'
  | 'distribution'
  | 'maintenance'
  | 'maintenance_interventions'
  | 'maintenance_gantt'
  | 'maintenance_history'
  | 'maintenance_preventive'
  | 'notifications'
  | 'supply_requests'
  | 'boat_preparation'
  | 'checkin'
  | 'checkout'
  | 'administrative_checkin';

export const PAGE_PERMISSIONS: Record<PagePermission, string> = {
  dashboard: 'Tableau de bord',
  boats: 'Bateaux',
  boats_dashboard: 'Bateaux - Dashboard',
  boats_fleet: 'Bateaux - Flotte',
  boats_safety_controls: 'Bateaux - Contrôles de sécurité',
  safety_controls: 'Contrôles de sécurité',
  suppliers: 'Fournisseurs',
  orders: 'Commandes',
  stock: 'Stock',
  stock_inventory: 'Stock - Inventaire',
  stock_scanner: 'Stock - Scanner',
  stock_shipments: 'Stock - Préparation d\'expéditions',
  distribution: 'Distribution',
  maintenance: 'Maintenance',
  maintenance_interventions: 'Maintenance - Interventions',
  maintenance_gantt: 'Maintenance - Planning Gantt',
  maintenance_history: 'Maintenance - Historique',
  maintenance_preventive: 'Maintenance - Préventive',
  notifications: 'Notifications',
  supply_requests: 'Demandes approvisionnement',
  boat_preparation: 'Préparation des bateaux',
  checkin: 'Check-in',
  checkout: 'Check-out',
  administrative_checkin: 'Check-in administratif'
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
    // Direction always has access
    if (user?.role === 'direction') {
      return true;
    }
    
    // For chef_base, administratif, and technicians, check permissions (default to true if not set)
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