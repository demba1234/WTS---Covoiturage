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
2. Antoine crée son compte dans l'app comme un client, puis on le promeut (une seule fois, dans le SQL Editor) :
   `update public.profiles set role = 'concierge' where id = (select id from auth.users where email = 'antoine@exemple.com');`
3. Antoine ouvre `/concierge.html`, se connecte, choisit une demande, change le statut, écrit ses messages et sa proposition.
   Le client voit le changement en direct (temps réel, avec un rafraîchissement automatique de secours toutes les 30 s).

## Étape 5 : messages réels

Exécuter `supabase/step5-messages.sql` (après `step4-suivi.sql`).
Le client écrit à Antoine depuis l'onglet Messages. Antoine répond depuis `/concierge.html` (filtre « Messages », ou en bas de chaque demande),
avec la possibilité de proposer des options que le client « retient ». Pastille « Nouveau » côté Antoine, point sur l'onglet côté client, mise à jour en direct.
