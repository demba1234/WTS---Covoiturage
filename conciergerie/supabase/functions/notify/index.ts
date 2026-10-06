// Edge Function « notify » : appelée par la base (voir step7-notifications.sql) à chaque nouveau message / changement de demande.
// Secrets à définir : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…), WEBHOOK_SECRET.
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement par Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';
import { deliver } from './deliver.mjs';

Deno.serve(async (req: Request) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }
  const evt = await req.json();
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:contact@example.com',
    Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);

  const report = await deliver(evt, {
    webpush,
    getName: async (id: string) => {
      const { data } = await db.from('profiles').select('first_name,last_name').eq('id', id).maybeSingle();
      return data ? `${data.first_name} ${data.last_name}`.trim() : '';
    },
    subsForClient: async (id: string) =>
      (await db.from('push_subscriptions').select('endpoint,p256dh,auth').eq('user_id', id)).data || [],
    subsForConcierges: async () => {
      const ids = ((await db.from('profiles').select('id').eq('role', 'concierge')).data || []).map((p: { id: string }) => p.id);
      if (!ids.length) return [];
      return (await db.from('push_subscriptions').select('endpoint,p256dh,auth').in('user_id', ids)).data || [];
    },
    removeSub: async (endpoint: string) => { await db.from('push_subscriptions').delete().eq('endpoint', endpoint); },
  });
  return new Response(JSON.stringify(report), { headers: { 'Content-Type': 'application/json' } });
});
