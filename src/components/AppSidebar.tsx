import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { BarChart3, Ship, Users, Package, Wrench, ShoppingCart, Settings, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
const menuItems = [{
  title: 'Tableau de bord',
  url: '/',
  icon: BarChart3,
  roles: ['direction', 'chef_base', 'technicien']
}, {
  title: 'Bateaux',
  url: '/boats',
  icon: Ship,
  roles: ['direction', 'chef_base', 'technicien']
}, {
  title: 'Contrôles de Sécurité',
  url: '/safety-controls',
  icon: Shield,
  roles: ['direction', 'chef_base', 'technicien']
}, {
  title: 'Fournisseurs',
  url: '/suppliers',
  icon: Users,
  roles: ['direction', 'chef_base']
}, {
  title: 'Commandes',
  url: '/orders',
  icon: ShoppingCart,
  roles: ['direction', 'chef_base']
}, {
  title: 'Stock',
  url: '/stock',
  icon: Package,
  roles: ['direction', 'chef_base', 'technicien']
}, {
  title: 'Maintenance',
  url: '/maintenance',
  icon: Wrench,
  roles: ['direction', 'chef_base', 'technicien']
}, {
  title: 'Paramètres',
  url: '/settings',
  icon: Settings,
  roles: ['direction', 'chef_base']
}];
export function AppSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const [baseName, setBaseName] = useState<string>('');
  useEffect(() => {
    const fetchBaseName = async () => {
      if (user?.baseId && user.role !== 'direction') {
        try {
          const { data, error } = await supabase
            .from('bases')
            .select('name')
            .eq('id', user.baseId)
            .maybeSingle();
          
          if (error) {
            console.error('Error fetching base name:', error);
            return;
          }
          
          if (data) {
            setBaseName(data.name);
          }
        } catch (error) {
          console.error('Error in fetchBaseName:', error);
        }
      }
    };
    fetchBaseName();
  }, [user?.baseId, user?.role]);
  const filteredMenuItems = menuItems.filter(item => user && item.roles.includes(user.role));

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const getNavClass = (path: string) => {
    const isActive = location.pathname === path;
    return `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${isActive ? 'bg-marine-100 text-marine-700 font-medium' : 'text-white/80 hover:text-white hover:bg-white/10'}`;
  };
  return (
    <Sidebar className={`${!isMobile ? 'hidden sm:block' : ''} w-52 sm:w-56 lg:w-64 gradient-ocean wave-pattern`}>
      <SidebarContent className="p-2 sm:p-3 lg:p-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/60 text-xs uppercase tracking-wide mb-2 sm:mb-3 lg:mb-4">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {filteredMenuItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavClass(item.url)}
                      onClick={handleNavClick}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="text-xs sm:text-sm lg:text-base truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-4 sm:mt-6 lg:mt-8 p-2 sm:p-3 lg:p-4 bg-white/10 rounded-lg">
          <h3 className="text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">Base actuelle</h3>
          <p className="text-white/80 text-xs break-words">
            {user?.role === 'direction' ? 'Toutes les bases' : baseName || 'Chargement...'}
          </p>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}