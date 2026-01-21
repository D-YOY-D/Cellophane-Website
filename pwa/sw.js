/**
 * Cellophane PWA - Service Worker
 * Version: 1.0.0
 * 
 * Handles caching and offline functionality
 */

const CACHE_NAME = 'cellophane-pwa-v1';
const STATIC_ASSETS = [
    '/pwa/',
    '/pwa/index.html',
    '/pwa/styles.css',
    '/pwa/app.js',
    '/pwa/manifest.json',
    '/shared/supabase-client.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap'
];

// ===========================================
// INSTALL EVENT
// ===========================================

self.addEventListener('install', (event) => {
    console.log('📦 Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('✅ Service Worker: Installed');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('❌ Service Worker: Install failed', error);
            })
    );
});

// ===========================================
// ACTIVATE EVENT
// ===========================================

self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('🗑️ Service Worker: Deleting old cache', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('✅ Service Worker: Activated');
                return self.clients.claim();
            })
    );
});

// ===========================================
// FETCH EVENT
// ===========================================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') return;
    
    // Skip cross-origin requests except for CDN assets
    if (url.origin !== location.origin && !url.href.includes('cdn.jsdelivr.net') && !url.href.includes('fonts.googleapis.com')) {
        return;
    }
    
    // Network-first strategy for API calls
    if (url.pathname.includes('/rest/v1/') || url.hostname.includes('supabase.co')) {
        event.respondWith(networkFirst(request));
        return;
    }
    
    // Cache-first strategy for static assets
    event.respondWith(cacheFirst(request));
});

// ===========================================
// CACHING STRATEGIES
// ===========================================

/**
 * Cache-first strategy
 * Good for static assets that don't change often
 */
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        // Return cached response and update cache in background
        updateCache(request);
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Return offline fallback for navigation requests
        if (request.mode === 'navigate') {
            return caches.match('/pwa/index.html');
        }
        
        throw error;
    }
}

/**
 * Network-first strategy
 * Good for API calls where fresh data is important
 */
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful API responses
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Try to return cached response
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            console.log('📴 Service Worker: Returning cached API response');
            return cachedResponse;
        }
        
        // Return error response
        return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Update cache in background
 */
async function updateCache(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse);
        }
    } catch (error) {
        // Ignore update failures
    }
}

// ===========================================
// BACKGROUND SYNC (Future)
// ===========================================

self.addEventListener('sync', (event) => {
    console.log('🔄 Service Worker: Background sync', event.tag);
    
    if (event.tag === 'sync-cellophanes') {
        event.waitUntil(syncCellophanes());
    }
});

async function syncCellophanes() {
    // TODO: Implement offline queue sync
    console.log('🔄 Syncing offline cellophanes...');
}

// ===========================================
// PUSH NOTIFICATIONS (Future)
// ===========================================

self.addEventListener('push', (event) => {
    console.log('🔔 Service Worker: Push received');
    
    const data = event.data?.json() || {};
    const title = data.title || 'Cellophane';
    const options = {
        body: data.body || 'יש לך התראה חדשה',
        icon: '/pwa/icons/icon-192.png',
        badge: '/pwa/icons/icon-72.png',
        data: data.url || '/pwa/',
        actions: [
            { action: 'open', title: 'פתח' },
            { action: 'dismiss', title: 'סגור' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'dismiss') return;
    
    event.waitUntil(
        clients.openWindow(event.notification.data)
    );
});

console.log('✅ Service Worker: Loaded');
