import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { OfflineStatusIcon } from '@/components/OfflineStatusIcon';
import logoMiniature from '@/assets/logominiature.png';
export const Header = () => {
  const {
    user,
    logout
  } = useAuth();
  const navigate = useNavigate();
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'direction':
        return 'bg-purple-100 text-purple-800';
      case 'chef_base':
        return 'bg-blue-100 text-blue-800';
      case 'technicien':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'direction':
        return 'Direction';
      case 'chef_base':
        return 'Chef de Base';
      case 'technicien':
        return 'Technicien';
      default:
        return role;
    }
  };
  return <header className="relative h-12 md:h-14 lg:h-16 border-b border-gray-200 flex items-center justify-between px-2 md:px-4 lg:px-6 shadow-sm bg-marine-50">
      <div className="flex items-center gap-1 md:gap-2 lg:gap-4 min-w-0 flex-1">
        <SidebarTrigger className="text-marine-600 hover:text-marine-700 flex-shrink-0" />
        <div className="flex items-center gap-1 md:gap-2 lg:gap-3 min-w-0">
          <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-marine-500 to-ocean-500 rounded-lg flex items-center justify-center flex-shrink-0 p-0.5">
            <img src={logoMiniature} alt="Corail Caraibes" className="w-full h-full object-contain" />
          </div>
          <h1 className="h1-responsive font-semibold text-gray-900 hidden xs:block truncate">Corail Caraibes</h1>
        </div>
      </div>

      <div className="flex items-center gap-1 md:gap-2 lg:gap-4 flex-shrink-0">
        <NotificationDropdown />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 lg:gap-3 h-auto p-1 lg:p-2">
              <div className="text-right hidden md:block">
                <div className="font-medium text-xs sm:text-sm truncate max-w-24 lg:max-w-none">{user?.name}</div>
                <Badge className={`text-xs truncate ${getRoleBadgeColor(user?.role || '')}`}>
                  {getRoleLabel(user?.role || '')}
                </Badge>
              </div>
              <Avatar className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8">
                <AvatarFallback className="bg-marine-100 text-marine-700 text-xs lg:text-sm">
                  {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 sm:w-56 bg-white z-50">
            <DropdownMenuItem onClick={() => navigate('/settings?tab=profile')}>
              <User className="mr-2 h-4 w-4" />
              <span className="text-sm">Profil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span className="text-sm">Paramètres</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span className="text-sm">Déconnexion</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <OfflineStatusIcon />
      </div>
    </header>;
};