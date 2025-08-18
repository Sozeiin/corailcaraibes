import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WorkflowNotification {
  id: string;
  order_id: string;
  notification_type: string;
  title: string;
  message: string;
  is_sent: boolean;
  sent_at?: string;
  created_at: string;
}

export function WorkflowNotificationCenter() {
  const { user } = useAuth();

  const { data: notifications = [] } = useQuery({
    queryKey: ['workflow-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('workflow_notifications')
        .select('*')
        .eq('recipient_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as WorkflowNotification[];
    },
    enabled: !!user?.id,
    refetchInterval: 15000 // Refresh every 15 seconds
  });

  const getNotificationIcon = (type: string, isSent: boolean) => {
    if (!isSent) return <Clock className="w-4 h-4 text-gray-400" />;
    
    switch (type) {
      case 'urgent_approval':
      case 'stuck_alert':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'approval_required':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'auto_reception':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'urgent_approval':
      case 'stuck_alert':
        return 'border-l-red-500 bg-red-50';
      case 'approval_required':
        return 'border-l-orange-500 bg-orange-50';
      case 'auto_reception':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  if (!user) return null;

  const unreadCount = notifications.filter(n => !n.is_sent).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notifications Workflow
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>Aucune notification</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-l-4 rounded-r-lg ${getNotificationColor(notification.notification_type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getNotificationIcon(notification.notification_type, notification.is_sent)}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {notification.notification_type.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(notification.created_at), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {!notification.is_sent && (
                    <Badge variant="secondary" className="text-xs">
                      En attente
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}