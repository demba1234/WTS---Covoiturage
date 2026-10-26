/* Service worker : l'app s'ouvre hors ligne (coque uniquement). */
var CACHE = 'wts-conciergerie-v4';
var SHELL = ['./','index.html','style.css','app.js','config.js','vendor/supabase.js','manifest.webmanifest','icons/icon.svg','icons/icon-192.png','icons/icon-512.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL);}).then(function(){return self.skipWaiting();}));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method!=='GET' || new URL(req.url).origin!==location.origin) return;
  e.respondWith(
    fetch(req).then(function(res){
      var copy = res.clone();
      caches.open(CACHE).then(function(c){c.put(req,copy);});
      return res;
    }).catch(function(){return caches.match(req).then(function(r){return r||caches.match('index.html');});})
  );
});

/* Notifications push : affichage et ouverture de l'app au bon écran. */
self.addEventListener('push', function(e){
  var d={};
  try{d=e.data?e.data.json():{};}catch(_){d={title:'WTS Conciergerie',body:e.data?e.data.text():''};}
  e.waitUntil(self.registration.showNotification(d.title||'WTS Conciergerie',{
    body:d.body||'', icon:'icons/icon-192.png', badge:'icons/icon-192.png',
    tag:d.tag||undefined, renotify:!!d.tag, data:{url:d.url||'/index.html'}
  }));
});
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var target=new URL((e.notification.data&&e.notification.data.url)||'/index.html', self.location.origin);
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){
    for(var i=0;i<list.length;i++){
      var c=list[i], u=new URL(c.url);
      if(u.pathname.replace(/\.html$/,'')===target.pathname.replace(/\.html$/,'')&&'focus' in c){
        c.postMessage({type:'nav',hash:target.hash});
        return c.focus();
      }
    }
    return self.clients.openWindow(target.href);
  }));
});
