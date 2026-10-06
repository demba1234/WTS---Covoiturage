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
