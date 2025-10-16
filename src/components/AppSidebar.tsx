import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateAllRelatedQueries } from '@/lib/queryInvalidation';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, useSidebar } from '@/components/ui/sidebar';
import { BarChart3, Ship, Users, Package, Wrench, ShoppingCart, Settings, ChevronDown, Truck, AlertTriangle, FileText, Clock, ClipboardCheck, MessageSquare, Shield, UserCheck } from 'lucide-react';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
const menuItems = [{
  title: 'Tableau de bord',
  url: '/',
  icon: BarChart3,
  roles: ['direction', 'chef_base', 'technicien', 'administratif']
}, {
  title: 'Bateaux',
  icon: Ship,
  roles: ['direction', 'chef_base', 'technicien', 'administratif'],
  subItems: [{
    title: 'Dashboard',
    url: '/boats/dashboard'
  }, {
    title: 'Flotte',
    url: '/boats'
  }, {
    title: 'Contrôles des bateaux',
    url: '/safety-controls'
  }]
}, {
  title: 'Check-in/out',
  icon: ClipboardCheck,
  roles: ['direction', 'chef_base', 'technicien', 'administratif'],
  subItems: [{
    title: 'Check-in',
    url: '/checkin'
  }, {
    title: 'Check-out',
    url: '/checkout'
  }]
}, {
  title: 'Fichier Clients',
  url: '/customers',
  icon: UserCheck,
  roles: ['direction', 'chef_base', 'administratif']
}, {
  title: 'Fournisseurs',
  url: '/suppliers',
  icon: Truck,
  roles: ['direction', 'chef_base', 'administratif']
}, {
  title: 'Commandes',
  url: '/supply-requests',
  icon: ShoppingCart,
  roles: ['direction', 'chef_base', 'administratif']
}, {
  title: 'Stock',
  icon: Package,
  roles: ['direction', 'chef_base', 'technicien', 'administratif'],
  subItems: [{
    title: 'Inventaire',
    url: '/stock'
  }, {
    title: 'Scanner',
    url: '/stock/scanner'
  }, {
    title: 'Préparations d\'expéditions',
    url: '/preparations-expeditions',
    roles: ['direction', 'chef_base', 'administratif']
  }]
}, {
  title: 'Maintenance',
  icon: Wrench,
  roles: ['direction', 'chef_base', 'technicien', 'administratif'],
  subItems: [{
    title: 'Interventions',
    url: '/maintenance'
  }, {
    title: 'Préventive',
    url: '/maintenance/preventive',
    roles: ['direction', 'chef_base', 'administratif']
  }, {
    title: 'Planning',
    url: '/maintenance/gantt',
    roles: ['direction', 'chef_base', 'administratif']
  }, {
    title: 'Historique',
    url: '/maintenance/history'
  }]
}, {
  title: 'Préparation bateaux',
  url: '/boat-preparation',
  icon: Ship,
  roles: ['direction', 'chef_base', 'technicien', 'administratif']
}, {
  title: 'Messagerie',
  url: '/messagerie',
  icon: MessageSquare,
  roles: ['direction', 'chef_base', 'technicien', 'administratif']
}, {
  title: 'Paramètres',
  url: '/settings',
  icon: Settings,
  roles: ['direction', 'chef_base', 'technicien', 'administratif']
}];
export function AppSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [baseName, setBaseName] = useState<string>('');
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});
  const { isSuperAdmin } = useIsSuperAdmin();
  useEffect(() => {
    const fetchBaseName = async () => {
      if (user?.baseId && user.role !== 'direction') {
        try {
          const {
            data,
            error
          } = await supabase.from('bases').select('name').eq('id', user.baseId).maybeSingle();
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
  const filteredMenuItems = menuItems.filter(item => user && item.roles.includes(user.role)).map(item => ({
    ...item,
    subItems: item.subItems?.filter(subItem => !subItem.roles || user && subItem.roles.includes(user.role))
  }));
  const handleNavClick = () => {
    console.log('🔄 Navigation click - refreshing data...');
    invalidateAllRelatedQueries(queryClient);
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  const getNavClass = (path: string) => {
    const isActive = location.pathname === path;
    return `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${isActive ? 'bg-marine-100 text-marine-700 font-medium' : 'text-white/80 hover:text-white hover:bg-white/10'}`;
  };
  const handleSubMenuToggle = (title: string, open: boolean) => {
    setOpenSubMenus(prev => ({
      ...prev,
      [title]: open
    }));
  };
  const isSubItemActive = (subItems: Array<{
    url: string;
    roles?: string[];
  }>) => {
    return subItems.some(subItem => location.pathname === subItem.url);
  };
  return <Sidebar className={`${!isMobile ? 'hidden sm:block' : ''} w-52 sm:w-56 lg:w-64 gradient-ocean wave-pattern`}>
      <SidebarContent className="p-2 sm:p-3 lg:p-4">
        <SidebarGroup className="my-[50px]">
          <SidebarGroupLabel className="text-white/60 text-xs uppercase tracking-wide mb-2 sm:mb-3 lg:mb-4">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {filteredMenuItems.map(item => <SidebarMenuItem key={item.title}>
                  {item.subItems ? <div onMouseEnter={() => handleSubMenuToggle(item.title, true)} onMouseLeave={() => handleSubMenuToggle(item.title, false)}>
                      <SidebarMenuButton className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${isSubItemActive(item.subItems) ? 'bg-marine-100 text-marine-700 font-medium' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="text-xs sm:text-sm lg:text-base truncate">{item.title}</span>
                        <ChevronDown className={`h-3 w-3 ml-auto transition-transform duration-200 ${openSubMenus[item.title] ? 'rotate-180' : ''}`} />
                      </SidebarMenuButton>
                      
                      {openSubMenus[item.title] && <SidebarMenuSub className="ml-4 mt-1 space-y-1">
                          {item.subItems.map(subItem => <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild>
                                <NavLink to={subItem.url} className={getNavClass(subItem.url)} onClick={handleNavClick}>
                                  <span className="text-xs sm:text-sm lg:text-base truncate">{subItem.title}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>)}
                        </SidebarMenuSub>}
                    </div> : <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavClass(item.url)} onClick={handleNavClick}>
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="text-xs sm:text-sm lg:text-base truncate my-0">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>}
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-white/60 text-xs uppercase tracking-wide mb-2 sm:mb-3 lg:mb-4">
              Super Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin" className={getNavClass('/admin')} onClick={handleNavClick}>
                      <Shield className="h-4 w-4 flex-shrink-0" />
                      <span className="text-xs sm:text-sm lg:text-base truncate">Administration</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>;
}