/* Renseignez ces deux valeurs (Supabase > Project Settings > API).
   La clé « anon » est publique par conception : la sécurité repose sur les règles RLS du schéma.
   Laissées vides, l'app tourne en mode démo (données d'exemple). */
window.WTS_CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  VAPID_PUBLIC_KEY: ''   /* clé publique des notifications (voir README, étape 7) */
};
