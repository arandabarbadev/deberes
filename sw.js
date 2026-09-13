// Service worker: guarda los archivos de la web (y los de Firebase)
// para que "Mis deberes" funcione como una app y también sin conexión.

const CACHE = 'deberes-v4';
const ARCHIVOS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './firebase.js',
  './manifest.webmanifest',
  './icono-192.png',
  './icono-512.png',
  './icono-180.png',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js',
];

// Al instalarse, guarda todo en la caché. Si algún archivo de internet
// no se pudiera guardar, se guardan los demás (allSettled no se rinde)
self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(ARCHIVOS.map(archivo => cache.add(archivo))),
    ),
  );
});

// Al activarse, borra las copias antiguas
self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys().then(claves => Promise.all(
      claves.filter(c => c !== CACHE).map(c => caches.delete(c)),
    )),
  );
});

// Pide primero la versión nueva por internet y,
// si no hay conexión, usa la copia guardada
self.addEventListener('fetch', evento => {
  evento.respondWith(
    fetch(evento.request).catch(() => caches.match(evento.request)),
  );
});
