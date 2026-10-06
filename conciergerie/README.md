# WTS Conciergerie

Application installable (PWA) pour iPhone et Android. Projet indépendant de WTS Covoiturage.

**Étape 1 (actuelle)** : tous les écrans du prototype, en données d'exemple.

Lancer en local : `cd conciergerie && python3 -m http.server 8765`, puis ouvrir http://localhost:8765.
Sur téléphone : ouvrir l'adresse dans Safari (iPhone) ou Chrome (Android), puis « Sur l'écran d'accueil ».

## Étape 2 : compte et profil (Supabase)

1. Créer un projet sur supabase.com.
2. SQL Editor : exécuter `supabase/schema.sql`.
3. Authentication > Providers > Email : activer. Pour tester vite, désactiver « Confirm email » (à réactiver ensuite).
4. Project Settings > API : copier l'URL et la clé `anon` dans `config.js`.

Sans `config.js` rempli, l'app reste en mode démo (données d'exemple).

## Étape 3 : demandes et panier enregistrés

Dans Supabase > SQL Editor, exécuter `supabase/step3-demandes.sql` (après `schema.sql`).
Crée les demandes, le panier et le dépôt privé `documents` (copie du passeport).

## Étape 4 : suivi réel et espace concierge

1. Exécuter `supabase/step4-suivi.sql` dans le SQL Editor (après `step3-demandes.sql`).
2. Abou crée son compte dans l'app comme un client, puis on le promeut (une seule fois, dans le SQL Editor) :
   `update public.profiles set role = 'concierge' where id = (select id from auth.users where email = 'abou@exemple.com');`
3. Abou ouvre `/concierge.html`, se connecte, choisit une demande, change le statut, écrit ses messages et sa proposition.
   Le client voit le changement en direct (temps réel, avec un rafraîchissement automatique de secours toutes les 30 s).

## Étape 5 : messages réels

Exécuter `supabase/step5-messages.sql` (après `step4-suivi.sql`).
Le client écrit à Abou depuis l'onglet Messages. Abou répond depuis `/concierge.html` (filtre « Messages », ou en bas de chaque demande),
avec la possibilité de proposer des options que le client « retient ». Pastille « Nouveau » côté Abou, point sur l'onglet côté client, mise à jour en direct.

## Étape 6 : mise en ligne

Hébergé sur Vercel (projet `wts-conciergerie`) : https://wts-conciergerie.vercel.app (espace concierge : `/concierge`).
Le projet Vercel est relié au dépôt, dossier `conciergerie/`. Pour changer de branche de production : Vercel > Settings > Git.
La bibliothèque Supabase est hébergée avec l'app (`vendor/supabase.js`, v2.117.2), sans CDN externe.
Pour activer les vrais comptes en ligne : renseigner `config.js` (URL et clé anon Supabase), pousser, Vercel redéploie.

Installation sur téléphone : Android (Chrome) bouton « Installer » dans Profil ; iPhone (Safari) Partager > Sur l'écran d'accueil.

## Étape 7 : notifications push

Qui est prévenu : le client quand Abou lui écrit ou fait avancer une demande ; Abou quand un client écrit, crée une demande ou valide une proposition.

1. Générer les clés : `npx web-push generate-vapid-keys`. La clé **publique** va dans `config.js` (`VAPID_PUBLIC_KEY`). La clé **privée** ne va jamais dans le dépôt.
2. Depuis le dossier `conciergerie/` avec la CLI Supabase : 
   `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:vous@exemple.com WEBHOOK_SECRET=<un long mot de passe au hasard>`
   puis `supabase functions deploy notify --no-verify-jwt` (la base l'appelle avec le secret, pas avec un jeton utilisateur).
3. SQL Editor : exécuter `supabase/step7-notifications.sql`, puis une seule fois :
   `insert into public.push_config (url, secret) values ('https://<ref-du-projet>.supabase.co/functions/v1/notify', '<le même WEBHOOK_SECRET>');`
4. Chaque personne active les notifications depuis l'app (Profil, ou la barre de l'espace concierge). Sur iPhone, l'app doit d'abord être installée sur l'écran d'accueil (iOS 16.4 ou plus).

Une panne du service de notification ne bloque jamais l'envoi d'un message ou d'une demande. Les appareils expirés sont retirés automatiquement.
