// Edge Function : paytech-ipn
//
// Reçoit la notification de paiement (IPN) envoyée par PayTech en
// arrière-plan après complétion (ou annulation) du paiement, et met à
// jour payments / bookings / trip_occurrences en conséquence.
//
// ATTENTION : le schéma de vérification ci-dessous (sha256 de la clé API
// et du secret, comparés aux champs api_key_sha256 / api_secret_sha256
// envoyés par PayTech) correspond à la documentation publique PayTech au
// moment de l'écriture. À VALIDER avant mise en production — ne jamais
// traiter une IPN sans vérifier cette signature, sous peine de permettre
// à quiconque de confirmer un paiement fictif.
//
// Cette route doit être configurée comme ipn_url dans paytech-init et
// déclarée chez PayTech comme publique (pas de JWT Supabase attendu ici,
// c'est PayTech qui appelle ce endpoint, pas l'app mobile).

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

serve(async (req) => {
  try {
    const form = await req.formData();
    const refCommand = String(form.get('ref_command') ?? '');
    const typeEvent = String(form.get('type_event') ?? '');
    const finalAmount = Number(form.get('final_amount') ?? form.get('item_price') ?? 0);
    const paymentMethod = String(form.get('payment_method') ?? '');
    const apiKeySha256 = String(form.get('api_key_sha256') ?? '');
    const apiSecretSha256 = String(form.get('api_secret_sha256') ?? '');

    const expectedKeyHash = await sha256Hex(Deno.env.get('PAYTECH_API_KEY') ?? '');
    const expectedSecretHash = await sha256Hex(Deno.env.get('PAYTECH_API_SECRET') ?? '');

    if (apiKeySha256 !== expectedKeyHash || apiSecretSha256 !== expectedSecretHash) {
      return new Response('Invalid signature', { status: 401 });
    }

    const bookingId = refCommand.replace(/^booking-/, '');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (typeEvent === 'sale_complete') {
      await supabaseAdmin
        .from('payments')
        .update({ status: 'success', payment_method: mapPaymentMethod(paymentMethod), amount: finalAmount })
        .eq('booking_id', bookingId);

      await supabaseAdmin.from('bookings').update({ status: 'confirmee' }).eq('id', bookingId);
    } else {
      // sale_canceled ou autre événement d'échec : on libère la place
      // réservée via la même fonction que pour une annulation passager,
      // en s'appuyant sur le service role (contourne la vérification
      // auth.uid() de cancel_booking, donc appelée ici directement en SQL
      // plutôt que via RPC).
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('occurrence_id, seats_count, status')
        .eq('id', bookingId)
        .single();

      if (booking && booking.status === 'en_attente_paiement') {
        // Incrément atomique des places (voir migration 0002,
        // release_occurrence_seats) pour éviter toute race condition avec
        // une réservation concurrente.
        await supabaseAdmin.rpc('release_occurrence_seats', {
          p_occurrence_id: booking.occurrence_id,
          p_seats_count: booking.seats_count,
        });

        await supabaseAdmin.from('payments').update({ status: 'failed' }).eq('booking_id', bookingId);
        await supabaseAdmin.from('bookings').update({ status: 'annulee_passager' }).eq('id', bookingId);
      }
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('paytech-ipn error', err);
    return new Response('Internal error', { status: 500 });
  }
});

function mapPaymentMethod(raw: string): 'carte' | 'wave' | 'orange_money' | null {
  const normalized = raw.toLowerCase();
  if (normalized.includes('wave')) return 'wave';
  if (normalized.includes('orange')) return 'orange_money';
  if (normalized.includes('card') || normalized.includes('carte')) return 'carte';
  return null;
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
