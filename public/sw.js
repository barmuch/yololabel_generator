const CACHE_NAME = 'yolo-labeler-v1';
const STATIC_ASSETS = [
  '/',
  '/labeler',
  '/manifest.json',
  '/_next/static/css/app/layout.css',
  '/_next/static/css/app/page.css',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip requests to external domains
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }

        // Otherwise, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the response for future use
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If network fails and we're requesting an HTML page,
            // return a generic offline page
            if (event.request.destination === 'document') {
              return new Response(
                `<!DOCTYPE html>
                <html>
                <head>
                  <title>Offline - YOLO Label Generator</title>
                  <style>
                    body { 
                      font-family: system-ui, sans-serif; 
                      display: flex; 
                      align-items: center; 
                      justify-content: center; 
                      min-height: 100vh; 
                      margin: 0; 
                      background: #f5f5f5; 
                    }
                    .container { 
                      text-align: center; 
                      padding: 2rem; 
                      background: white; 
                      border-radius: 8px; 
                      box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
                    }
                    h1 { color: #333; margin-bottom: 1rem; }
                    p { color: #666; margin-bottom: 1.5rem; }
                    button { 
                      background: #007bff; 
                      color: white; 
                      border: none; 
                      padding: 0.75rem 1.5rem; 
                      border-radius: 4px; 
                      cursor: pointer; 
                    }
                    button:hover { background: #0056b3; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>You're Offline</h1>
                    <p>The YOLO Label Generator is available offline! Your work is automatically saved locally.</p>
                    <p>You can continue labeling your images even without an internet connection.</p>
                    <button onclick="window.location.reload()">Try Again</button>
                  </div>
                </body>
                </html>`,
                {
                  headers: {
                    'Content-Type': 'text/html',
                  },
                }
              );
            }
          });
      })
  );
});

// Handle background sync for saving data
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    // Implement background sync logic here if needed
  }
});

// Handle push notifications (if needed in the future)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '1',
      },
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});
