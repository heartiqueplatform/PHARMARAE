// lib/notificationService.ts
import { db } from './db';

// Replace with your actual VAPID keys
// Generate with: web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = 'BKACFyCH6rEQdbITkj0TVBZ3tdKdqxGlzHxIjGg6OUG24mAG9De9qVZp9nxueqr97WrTUmYSWp1PQW1LjyT1uBM';

export interface NotificationData {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    requireInteraction?: boolean;
    vibrate?: number[];
    data?: {
        url?: string;
        saleId?: string;
        productId?: string;
        type?: 'sale' | 'inventory' | 'system';
        [key: string]: any;
    };
    actions?: Array<{ action: string; title: string }>;
}

class NotificationService {
    private isSupported: boolean;
    private swRegistration: ServiceWorkerRegistration | null = null;

    constructor() {
        this.isSupported = this.checkSupport();
        console.log('🔔 Notification Service:', this.isSupported ? '✅ Supported' : '❌ Not Supported');
    }

    private checkSupport(): boolean {
        return 'Notification' in window &&
            'serviceWorker' in navigator &&
            'PushManager' in window;
    }

    isSupportedBrowser(): boolean {
        return this.isSupported;
    }

    getPermissionStatus(): NotificationPermission {
        if (!this.isSupported) return 'denied';
        return Notification.permission;
    }

    async requestPermission(): Promise<NotificationPermission> {
        if (!this.isSupported) {
            console.warn('Notifications not supported');
            return 'denied';
        }

        try {
            const permission = await Notification.requestPermission();
            console.log('🔔 Notification permission:', permission);
            return permission;
        } catch (error) {
            console.error('Error requesting permission:', error);
            return 'denied';
        }
    }

    async initialize(): Promise<boolean> {
        if (!this.isSupported) return false;
        if (Notification.permission !== 'granted') return false;

        try {
            this.swRegistration = await navigator.serviceWorker.ready;
            console.log('✅ Service Worker ready for notifications');
            return true;
        } catch (error) {
            console.error('Error initializing:', error);
            return false;
        }
    }

    async subscribeToPush(userId: string, pharmacyName: string): Promise<boolean> {
        if (!this.isSupported || Notification.permission !== 'granted') {
            console.warn('Cannot subscribe: not supported or permission denied');
            return false;
        }

        try {
            if (!this.swRegistration) {
                await this.initialize();
            }

            if (!this.swRegistration) {
                throw new Error('Service Worker not ready');
            }

            let subscription = await this.swRegistration.pushManager.getSubscription();

            if (subscription) {
                console.log('✅ Already subscribed');
                await this.saveSubscription(subscription, userId, pharmacyName);
                return true;
            }

            const applicationServerKey = this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

            subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey
            });

            console.log('✅ Push subscription successful');
            await this.saveSubscription(subscription, userId, pharmacyName);

            return true;

        } catch (error) {
            console.error('❌ Subscribe error:', error);
            return false;
        }
    }

    async unsubscribeFromPush(): Promise<boolean> {
        if (!this.isSupported || !this.swRegistration) return false;

        try {
            const subscription = await this.swRegistration.pushManager.getSubscription();
            if (subscription) {
                const success = await subscription.unsubscribe();
                if (success) {
                    await this.removeSubscription(subscription.endpoint);
                }
                return success;
            }
            return true;
        } catch (error) {
            console.error('Unsubscribe error:', error);
            return false;
        }
    }

    private async saveSubscription(
        subscription: PushSubscription,
        userId: string,
        pharmacyName: string
    ): Promise<void> {
        try {
            const subscriptionData = {
                user_id: userId,
                pharmacy_name: pharmacyName.toUpperCase(),
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
                    auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            await db.push_subscriptions.put(subscriptionData);
            await this.sendToServer('save', subscriptionData);
            console.log('✅ Subscription saved');

        } catch (error) {
            console.error('Error saving subscription:', error);
        }
    }

    private async removeSubscription(endpoint: string): Promise<void> {
        try {
            await db.push_subscriptions.where('endpoint').equals(endpoint).delete();
            await this.sendToServer('delete', { endpoint });
            console.log('✅ Subscription removed');
        } catch (error) {
            console.error('Error removing subscription:', error);
        }
    }

    private async sendToServer(
        action: 'save' | 'delete',
        data: any
    ): Promise<void> {
        try {
            console.log(`📤 [${action}] Subscription data:`, data);
        } catch (error) {
            console.error('Server sync error:', error);
        }
    }

    // ============================================
    // 🔔 SEND NOTIFICATION - FIXED VERSION
    // ============================================
    async sendNotification(data: NotificationData): Promise<void> {
        console.log('📤 sendNotification called with data:', data);

        // Make sure SW is ready
        if (!this.swRegistration) {
            console.log('⏳ SW not ready, initializing...');
            await this.initialize();
        }

        // If SW still not ready, use direct notification
        if (!this.swRegistration || !this.swRegistration.active) {
            console.warn('⚠️ SW still not ready, using direct notification');
            this.showDirectNotification(data);
            return;
        }

        try {
            // Wait for SW to be fully ready
            await navigator.serviceWorker.ready;

            // Send message to SW
            this.swRegistration.active.postMessage({
                type: 'SHOW_NOTIFICATION',
                payload: data
            });
            console.log('✅ Notification sent via SW');
        } catch (error) {
            console.error('❌ Error sending notification via SW:', error);
            // Fallback: Direct notification
            this.showDirectNotification(data);
        }
    }

    // ============================================
    // DIRECT NOTIFICATION FALLBACK
    // ============================================
    private showDirectNotification(data: NotificationData): void {
        if (Notification.permission !== 'granted') {
            console.warn('Cannot show direct notification: permission not granted');
            return;
        }

        try {
            const notification = new Notification(data.title, {
                body: data.body,
                icon: data.icon || '/pwa-192x192.png',
                badge: data.badge || '/pwa-192x192.png',
                tag: data.tag || `notif-${Date.now()}`,
                requireInteraction: data.requireInteraction !== false,
                vibrate: data.vibrate || [200, 100, 200],
                data: data.data || {}
            });

            notification.onclick = () => {
                notification.close();
                if (data.data?.url) {
                    window.open(data.data.url, '_blank');
                }
            };

            console.log('✅ Direct notification shown (fallback)');
        } catch (error) {
            console.error('❌ Error showing direct notification:', error);
        }
    }

    // ============================================
    // SPECIFIC NOTIFICATION TYPES
    // ============================================
    async notifySale(sale: any, pharmacyName: string): Promise<void> {
        const data: NotificationData = {
            title: `💰 New Sale - ${pharmacyName}`,
            body: `Sale #${sale.sale_number}: ${sale.product_name} x${sale.quantity} for ${sale.total} ${sale.pharmacy_currency || 'KSh'}`,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: `sale-${sale.id}`,
            requireInteraction: true,
            vibrate: [300, 150, 300, 150, 300],
            data: {
                type: 'sale',
                saleId: sale.id,
                url: `/?tab=sell&saleId=${sale.id}`,
                amount: sale.total,
                product: sale.product_name,
                quantity: sale.quantity
            },
            actions: [
                { action: 'view-sale', title: '💰 View Sale' },
                { action: 'dismiss', title: '❌ Dismiss' }
            ]
        };

        await this.sendNotification(data);
        console.log('🔔 Sale notification sent');
    }

    async notifyLowStock(product: any, pharmacyName: string): Promise<void> {
        const data: NotificationData = {
            title: `⚠️ Low Stock Alert - ${pharmacyName}`,
            body: `${product.name} is running low (${product.quantity || 0} units remaining)`,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: `stock-${product.id}`,
            requireInteraction: true,
            vibrate: [200, 100, 200],
            data: {
                type: 'inventory',
                productId: product.id,
                url: '/?tab=stock'
            },
            actions: [
                { action: 'view-stock', title: '📦 Check Stock' },
                { action: 'dismiss', title: '❌ Dismiss' }
            ]
        };

        await this.sendNotification(data);
        console.log('🔔 Stock notification sent');
    }

    // ============================================
    // HELPERS
    // ============================================
    private urlBase64ToUint8Array(base64String: string): Uint8Array {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
}

// Singleton
let instance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
    if (!instance) {
        instance = new NotificationService();
    }
    return instance;
}