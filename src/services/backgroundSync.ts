import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { offlineSyncManager } from '@/lib/offlineSync';
import { toast } from '@/hooks/use-toast';

export class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private syncInterval: number | null = null;
  private isBackgroundEnabled = false;

  static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  async initialize() {
    if (!Capacitor.isNativePlatform()) {
      console.log('Background sync only available on native platforms');
      return;
    }

    await this.setupBackgroundMode();
    await this.setupPushNotifications();
  }

  private async setupBackgroundMode() {
    try {
      // Simplified background mode for now
      // Will be enhanced when background-mode plugin is available
      this.isBackgroundEnabled = true;
      this.startBackgroundSync();
    } catch (error) {
      console.error('Failed to setup background mode:', error);
    }
  }

  private async setupPushNotifications() {
    try {
      const permission = await PushNotifications.requestPermissions();
      
      if (permission.receive === 'granted') {
        await PushNotifications.register();
        
        PushNotifications.addListener('registration', (token) => {
          console.log('Push registration success, token: ' + token.value);
          // Store token for server-side notifications
          localStorage.setItem('push_token', token.value);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received: ', notification);
          toast({
            title: notification.title || 'Notification',
            description: notification.body || 'Nouvelle mise à jour disponible',
          });
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push notification action performed: ', notification);
          // Trigger immediate sync
          this.performImmediateSync();
        });
      }
    } catch (error) {
      console.error('Failed to setup push notifications:', error);
    }
  }

  private startBackgroundSync() {
    if (this.syncInterval) return;

    // Sync every 30 seconds in background
    this.syncInterval = window.setInterval(async () => {
      try {
        await offlineSyncManager.performFullSync();
        console.log('Background sync completed');
      } catch (error) {
        console.error('Background sync failed:', error);
      }
    }, 30000);
  }

  private stopBackgroundSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async performImmediateSync() {
    try {
      await offlineSyncManager.performFullSync();
      toast({
        title: "Synchronisation terminée",
        description: "Vos données sont à jour",
      });
    } catch (error) {
      console.error('Immediate sync failed:', error);
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de synchroniser les données",
        variant: "destructive",
      });
    }
  }

  async enableBackgroundSync() {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      this.isBackgroundEnabled = true;
      this.startBackgroundSync();
    } catch (error) {
      console.error('Failed to enable background sync:', error);
    }
  }

  async disableBackgroundSync() {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      this.isBackgroundEnabled = false;
      this.stopBackgroundSync();
    } catch (error) {
      console.error('Failed to disable background sync:', error);
    }
  }

  isEnabled(): boolean {
    return this.isBackgroundEnabled;
  }
}

export const backgroundSyncService = BackgroundSyncService.getInstance();