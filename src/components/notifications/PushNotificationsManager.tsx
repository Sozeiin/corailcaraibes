import { useState, useEffect } from 'react';
import { Bell, BellOff, Smartphone, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';
import {
  isPushSupported,
  isStandalone,
  isIOSorIPadOS,
  enablePushNotifications,
  unsubscribeFromPush,
  getSubscriptionStatus,
  registerServiceWorker,
} from '@/services/webPush';

type NotificationState = 'unsupported' | 'not-standalone' | 'default' | 'denied' | 'granted' | 'subscribed';

export function PushNotificationsManager() {
  const [state, setState] = useState<NotificationState>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();

  // Don't show on Capacitor native apps (they use native push)
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    checkNotificationStatus();
    
    // Register service worker on mount
    if (!isNative && isPushSupported()) {
      registerServiceWorker().catch(console.error);
    }
  }, [isNative]);

  async function checkNotificationStatus() {
    if (isNative) {
      return; // Skip for native apps
    }

    if (!isPushSupported()) {
      setState('unsupported');
      return;
    }

    // Check if iOS/iPadOS and not in standalone mode
    if (isIOSorIPadOS() && !isStandalone()) {
      setState('not-standalone');
      return;
    }

    const permission = Notification.permission;
    
    if (permission === 'denied') {
      setState('denied');
      return;
    }

    if (permission === 'granted') {
      // Check if actually subscribed
      const { isSubscribed: subStatus } = await getSubscriptionStatus();
      setIsSubscribed(subStatus);
      setState(subStatus ? 'subscribed' : 'granted');
    } else {
      setState('default');
    }
  }

  async function handleEnableNotifications() {
    setIsLoading(true);
    
    try {
      await enablePushNotifications();
      
      setIsSubscribed(true);
      setState('subscribed');
      
      toast({
        title: '✅ Notifications activées',
        description: 'Vous recevrez désormais les notifications push.',
      });
      
      await checkNotificationStatus();
    } catch (error: any) {
      console.error('Error enabling notifications:', error);
      
      toast({
        title: '❌ Erreur',
        description: error.message || 'Impossible d\'activer les notifications',
        variant: 'destructive',
      });
      
      await checkNotificationStatus();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDisableNotifications() {
    setIsLoading(true);
    
    try {
      await unsubscribeFromPush();
      
      setIsSubscribed(false);
      setState('granted');
      
      toast({
        title: 'Notifications désactivées',
        description: 'Vous ne recevrez plus de notifications push.',
      });
    } catch (error: any) {
      console.error('Error disabling notifications:', error);
      
      toast({
        title: 'Erreur',
        description: 'Impossible de désactiver les notifications',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Don't render for native apps
  if (isNative) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications Push
        </CardTitle>
        <CardDescription>
          Recevez des notifications même quand l'application est fermée
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Unsupported */}
        {state === 'unsupported' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Votre navigateur ne supporte pas les notifications push.
              Essayez avec Chrome, Edge, Firefox ou Safari (iOS 16.4+).
            </AlertDescription>
          </Alert>
        )}

        {/* iOS/iPadOS - Not standalone */}
        {state === 'not-standalone' && (
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">
                  Pour activer les notifications sur iOS/iPadOS :
                </p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Appuyez sur le bouton Partager (carré avec flèche)</li>
                  <li>Sélectionnez "Sur l'écran d'accueil"</li>
                  <li>Confirmez l'ajout</li>
                  <li>Ouvrez l'app depuis l'écran d'accueil</li>
                  <li>Revenez ici pour activer les notifications</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Permission denied */}
        {state === 'denied' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>Vous avez bloqué les notifications.</p>
                <p className="text-sm">
                  Pour les réactiver, allez dans les paramètres de votre navigateur :
                </p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li><strong>Chrome/Edge :</strong> Paramètres → Confidentialité → Paramètres des sites → Notifications</li>
                  <li><strong>Firefox :</strong> Paramètres → Vie privée et sécurité → Permissions → Notifications</li>
                  <li><strong>Safari :</strong> Préférences → Sites web → Notifications</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Not subscribed - can enable */}
        {(state === 'default' || state === 'granted') && (
          <>
            <Alert>
              <Bell className="h-4 w-4" />
              <AlertDescription>
                Activez les notifications pour être informé en temps réel des nouvelles tâches,
                interventions urgentes et mises à jour importantes.
              </AlertDescription>
            </Alert>
            
            <Button
              onClick={handleEnableNotifications}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>Activation en cours...</>
              ) : (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  Activer les notifications
                </>
              )}
            </Button>
          </>
        )}

        {/* Subscribed - can disable */}
        {state === 'subscribed' && isSubscribed && (
          <>
            <Alert className="bg-success/10 border-success">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                Les notifications push sont activées. Vous recevrez des alertes
                même quand l'application est fermée.
              </AlertDescription>
            </Alert>
            
            <Button
              variant="outline"
              onClick={handleDisableNotifications}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>Désactivation en cours...</>
              ) : (
                <>
                  <BellOff className="mr-2 h-4 w-4" />
                  Désactiver les notifications
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
