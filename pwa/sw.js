/**
 * Cellophane PWA Service Worker
 * Version: 1.3.0
 */

const CACHE_NAME = 'cellophane-pwa-v1.3';
const STATIC_ASSETS = [
    '/pwa/',
    '/pwa/index.html',
    '/pwa/styles.css',
    '/pwa/app.js',
    '/pwa/manifest.json',
    '/pwa/icons/icon-192.png',
    '/pwa/icons/icon-512.png',
    '/shared/supabase-client.js'
];

// Install - cache static assets
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker activated');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // Skip Supabase API requests (always use network)
    if (event.request.url.includes('supabase.co')) {
        return;
    }
    
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Clone and cache successful responses
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache
                return caches.match(event.request);
            })
    );
});
