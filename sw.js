const CACHE_NAME = 'ecosmart-dustbin-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/worker/index.html',
  '/worker/scanner.html',
  '/worker/success.html',
  '/user/index.html',
  '/user/dashboard.html',
  '/assets/css/style.css',
  '/assets/js/common.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('🔧 EcoSmart PWA: Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 EcoSmart PWA: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ EcoSmart PWA: Service Worker installed successfully');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('🚀 EcoSmart PWA: Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ EcoSmart PWA: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ EcoSmart PWA: Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          console.log('📂 EcoSmart PWA: Serving from cache:', event.request.url);
          return response;
        }

        console.log('🌐 EcoSmart PWA: Fetching from network:', event.request.url);
        return fetch(event.request).then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response for caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Offline fallback
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

// Background sync for offline transactions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync-transactions') {
    console.log('🔄 EcoSmart PWA: Background sync triggered');
    event.waitUntil(syncTransactions());
  }
});

async function syncTransactions() {
  // Sync offline transactions when back online
  const transactions = await getOfflineTransactions();
  for (const transaction of transactions) {
    try {
      await syncTransactionToFirebase(transaction);
      await removeOfflineTransaction(transaction);
    } catch (error) {
      console.error('❌ EcoSmart PWA: Sync failed:', error);
    }
  }
}

// Push notifications for credit updates
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New eco-credits earned!',
    icon: '/assets/images/icon-192x192.png',
    badge: '/assets/images/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      {
        action: 'explore',
        title: 'View Dashboard',
        icon: '/assets/images/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/assets/images/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('EcoSmart Dustbin', options)
  );
});
