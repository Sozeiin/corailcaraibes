import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Hook pour synchroniser les notifications en temps réel
 * et envoyer automatiquement les notifications push
 */
export function useNotificationSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('🔔 [NotificationSync] Démarrage de la synchronisation des notifications push...');

    const channel = supabase
      .channel('notification-push-sync')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        async (payload) => {
          console.log('📬 [NotificationSync] Nouvelle notification reçue:', payload.new);
          
          const notification = payload.new as any;

          try {
            // Appeler directement l'edge function send-web-push
            const { data, error } = await supabase.functions.invoke('send-web-push', {
              body: {
                userIds: [notification.user_id],
                title: notification.title || 'Fleet Manager',
                body: notification.message || 'Nouvelle notification',
                url: '/notifications'
              }
            });

            if (error) {
              console.error('❌ [NotificationSync] Erreur lors de l\'envoi du push:', error);
              toast({
                title: "Erreur notification push",
                description: error.message,
                variant: "destructive"
              });
            } else {
              console.log('✅ [NotificationSync] Notification push envoyée avec succès:', data);
              
              // Afficher un toast local aussi
              toast({
                title: notification.title,
                description: notification.message,
              });
            }

            // Invalider les requêtes de notifications
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          } catch (error) {
            console.error('💥 [NotificationSync] Exception lors de l\'envoi du push:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 [NotificationSync] Statut de la connexion:', status);
      });

    return () => {
      console.log('🔴 [NotificationSync] Arrêt de la synchronisation');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
