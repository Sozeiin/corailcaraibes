import React from 'react';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Notifications() {
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

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'intervention_assigned':
        return 'bg-blue-100 border-l-blue-500';
      case 'intervention_completed':
        return 'bg-green-100 border-l-green-500';
      case 'intervention_cancelled':
        return 'bg-red-100 border-l-red-500';
      default:
        return 'bg-gray-100 border-l-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Bell className="h-8 w-8" />
            Notifications
          </h1>
          <p className="text-gray-600 mt-2">
            {unreadCount > 0 
              ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
              : 'Toutes les notifications ont été lues'
            }
          </p>
        </div>
        
        {unreadCount > 0 && (
          <Button
            onClick={() => markAllAsRead()}
            disabled={isMarkingAllAsRead}
            className="flex items-center gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune notification
              </h3>
              <p className="text-gray-600">
                Vous n'avez reçu aucune notification pour le moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card 
              key={notification.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                !notification.is_read 
                  ? `${getNotificationColor(notification.type)} border-l-4` 
                  : 'border-l-4 border-l-gray-200'
              }`}
              onClick={() => {
                if (!notification.is_read) {
                  markAsRead(notification.id);
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-2xl">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <Badge variant="default" className="text-xs px-2 py-0">
                            Nouveau
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-700 mb-2">
                        {notification.message}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  {!notification.is_read && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      className="flex-shrink-0"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {notification.data && Object.keys(notification.data).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <details className="group">
                      <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                        Voir les détails
                      </summary>
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(notification.data, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}