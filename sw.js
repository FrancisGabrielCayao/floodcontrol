self.addEventListener('fetch', (event) => {
  // This allows the app to load from cache
  event.respondWith(fetch(event.request));
});