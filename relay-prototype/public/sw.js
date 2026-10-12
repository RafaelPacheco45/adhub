importScripts('/scram/scramjet.all.js');
const {ScramjetServiceWorker}=$scramjetLoadWorker();const relay=new ScramjetServiceWorker();
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>event.respondWith((async()=>{await relay.loadConfig();return relay.route(event)?relay.fetch(event):fetch(event.request);})()));
