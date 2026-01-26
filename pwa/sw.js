/**
 * Cellophane PWA Service Worker
 * Version: 1.8.0
 * 
 * Strategy: Network-first with selective caching
 * Only cache same-origin static assets (js/css/html/images)
 */

const CACHE_NAME = 'cellophane-static-v1.8.0';

// Static assets to precache on install
const STATIC_ASSETS = [
    '/pwa/',
    '/pwa/index.html',
    '/pwa/styles.css',
    '/pwa/app.js',
    '/pwa/manifest.json',
    '/shared/supabase-client.js'
];

// File extensions allowed for runtime caching
const CACHEABLE_EXTENSIONS = /\.(js|css|html|png|jpg|jpeg|gif|svg|webp|woff|woff2|ico)$/i;

// Install - precache static assets
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Precaching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch(err => console.error('❌ Precache failed:', err))
    );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker activated');
    event.waitUntil(
        caches.keys()
            .then(keys => {
                return Promise.all(
                    keys.filter(key => key.startsWith('cellophane-') && key !== CACHE_NAME)
                        .map(key => {
                            console.log('🗑️ Deleting old cache:', key);
                            return caches.delete(key);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch - network first, selective caching
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') return;
    
    // Skip cross-origin requests (API calls, CDNs, etc.)
    if (url.origin !== self.location.origin) return;
    
    // Skip Supabase and API requests
    if (url.pathname.includes('/rest/') || 
        url.pathname.includes('/auth/') ||
        url.hostname.includes('supabase')) {
        return;
    }
    
    // Only process cacheable file types
    const isCacheable = CACHEABLE_EXTENSIONS.test(url.pathname) || 
                        url.pathname.endsWith('/') ||
                        url.pathname.endsWith('/pwa') ||
                        url.pathname.endsWith('/pwa/');
    
    if (!isCacheable) return;
    
    // Network-first strategy
    event.respondWith(
        fetch(request)
            .then(response => {
                // Only cache successful same-origin responses
                if (response.status === 200 && response.type === 'basic') {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Network failed - try cache
                return caches.match(request);
            })
    );
});

// Message handler for manual cache clearing
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
    if (event.data === 'clearCache') {
        caches.keys().then(keys => {
            keys.forEach(key => caches.delete(key));
        });
    }
});
