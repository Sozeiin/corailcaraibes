import React from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
export function NotificationDropdown() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isMarkingAllAsRead
  } = useNotifications();
  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: fr
    });
  };
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'intervention_assigned':
        return '🔧';
      case 'intervention_completed':
        return '✅';
      case 'intervention_cancelled':
        return '❌';
      default:
        return '📋';
    }
  };
  return <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-min ">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={() => markAllAsRead()} disabled={isMarkingAllAsRead} className="h-auto p-1">
              <CheckCheck className="h-4 w-4" />
            </Button>}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-80">
          {notifications.length === 0 ? <div className="p-4 text-center text-sm text-muted-foreground">
              Aucune notification
            </div> : notifications.map(notification => <DropdownMenuItem key={notification.id} className={`p-3 cursor-pointer hover:bg-accent ${!notification.is_read ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`} onClick={() => {
          if (!notification.is_read) {
            markAsRead(notification.id);
          }
        }}>
                <div className="w-full">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      <span className="text-base">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                      </div>
                    </div>
                    {!notification.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />}
                  </div>
                </div>
              </DropdownMenuItem>)}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>;
}