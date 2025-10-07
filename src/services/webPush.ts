import { supabase } from '@/integrations/supabase/client';

// TODO: Replace with your actual VAPID public key after running: node scripts/generate-vapid.js
const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY_HERE';

/**
 * Convert a base64 string to Uint8Array
 * Required for VAPID public key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if Web Push is supported in the current browser
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 
         'PushManager' in window && 
         'Notification' in window;
}

/**
 * Check if the app is running in standalone mode (PWA installed)
 * Important for iOS/iPadOS
 */
export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

/**
 * Detect platform
 */
export function detectPlatform(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('android')) return 'android';
  if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
  if (userAgent.includes('mac')) return 'macos';
  if (userAgent.includes('windows')) return 'windows';
  
  return 'web';
}

/**
 * Check if iOS/iPadOS (version 16.4+)
 */
export function isIOSorIPadOS(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('iphone') || userAgent.includes('ipad');
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }

  const permission = await Notification.requestPermission();
  console.log('Notification permission:', permission);
  return permission;
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported');
  }

  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
  });

  console.log('Service worker registered:', registration);
  
  // Wait for service worker to be ready
  await navigator.serviceWorker.ready;
  
  return registration;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.ready;
  
  // Check if already subscribed
  let subscription = await registration.pushManager.getSubscription();
  
  if (!subscription) {
    // Subscribe to push notifications
    const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey as BufferSource,
    });
    
    console.log('New push subscription created:', subscription.endpoint);
  } else {
    console.log('Already subscribed to push:', subscription.endpoint);
  }
  
  return subscription;
}

/**
 * Save subscription to backend
 */
export async function saveSubscription(subscription: PushSubscription): Promise<void> {
  const platform = detectPlatform();
  const userAgent = navigator.userAgent;
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase.functions.invoke('subscribe-push', {
    body: {
      subscription: subscription.toJSON(),
      platform,
      userAgent,
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    console.error('Error saving subscription:', error);
    throw error;
  }

  console.log('Subscription saved to backend');
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  
  if (subscription) {
    await subscription.unsubscribe();
    console.log('Unsubscribed from push');
    
    // Notify backend
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      await supabase.functions.invoke('unsubscribe-push', {
        body: {
          endpoint: subscription.endpoint,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    }
  }
}

/**
 * Get current subscription status
 */
export async function getSubscriptionStatus(): Promise<{
  isSubscribed: boolean;
  subscription: PushSubscription | null;
}> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    return {
      isSubscribed: subscription !== null,
      subscription,
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return {
      isSubscribed: false,
      subscription: null,
    };
  }
}

/**
 * Enable push notifications (complete flow)
 */
export async function enablePushNotifications(): Promise<void> {
  // 1. Request permission
  const permission = await requestNotificationPermission();
  
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }
  
  // 2. Register service worker (if not already)
  await registerServiceWorker();
  
  // 3. Subscribe to push
  const subscription = await subscribeToPush();
  
  // 4. Save to backend
  await saveSubscription(subscription);
  
  console.log('Push notifications enabled successfully');
}
