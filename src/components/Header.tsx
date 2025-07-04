
import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Bell, LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const Header = () => {
  const { user, logout } = useAuth();

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

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 shadow-sm">
      <div className="flex items-center gap-2 sm:gap-4">
        <SidebarTrigger className="text-marine-600 hover:text-marine-700" />
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-marine-500 to-ocean-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs sm:text-sm">FC</span>
          </div>
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900 hidden xs:block">FleetCat</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="sm" className="relative p-2">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs">
            3
          </span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 sm:gap-3 h-auto p-1 sm:p-2">
              <div className="text-right hidden sm:block">
                <div className="font-medium text-sm">{user?.name}</div>
                <Badge className={`text-xs ${getRoleBadgeColor(user?.role || '')}`}>
                  {getRoleLabel(user?.role || '')}
                </Badge>
              </div>
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                <AvatarFallback className="bg-marine-100 text-marine-700 text-xs sm:text-sm">
                  {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white z-50">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profil</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Paramètres</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Déconnexion</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
