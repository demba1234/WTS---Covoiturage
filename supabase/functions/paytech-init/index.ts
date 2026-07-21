// Edge Function : paytech-init
//
// Initialise un paiement PayTech pour une réservation (statut
// en_attente_paiement) et retourne l'URL de paiement hébergée par
// PayTech vers laquelle rediriger le passager (le client ouvre cette URL,
// ex. via Linking.openURL ou une WebView).
//
// ATTENTION : les noms de champs et l'URL de l'API PayTech ci-dessous
// correspondent à la documentation publique de PayTech Sénégal au moment
// de l'écriture (endpoint request-payment, en-têtes API_KEY/API_SECRET).
// À VALIDER avant mise en production avec le contrat PayTech actuel de
// WTS (les intégrateurs de paiement font évoluer leurs API sans préavis).
//
// Secrets requis (supabase secrets set ...) :
//   PAYTECH_API_KEY, PAYTECH_API_SECRET, PAYTECH_ENV ("test" | "prod")
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (déjà fournis par la plateforme)
//   APP_PAYMENT_SUCCESS_URL, APP_PAYMENT_CANCEL_URL (deep links de l'app)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';

const PAYTECH_REQUEST_URL = 'https://paytech.sn/api/payment/request-payment';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { bookingId } = await req.json();
    if (!bookingId) {
      return jsonResponse({ error: 'bookingId requis' }, 400);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    if (!user) {
      return jsonResponse({ error: 'Non authentifié' }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('id, passenger_id, seats_count, status, occurrence:trip_occurrences(trip_template:trip_templates(price_per_seat))')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return jsonResponse({ error: 'Réservation introuvable' }, 404);
    }
    if (booking.passenger_id !== user.id) {
      return jsonResponse({ error: 'Non autorisé' }, 403);
    }
    if (booking.status !== 'en_attente_paiement') {
      return jsonResponse({ error: 'Cette réservation ne peut plus être payée' }, 409);
    }

    const pricePerSeat = (booking as any).occurrence?.trip_template?.price_per_seat ?? 0;
    const amount = pricePerSeat * booking.seats_count;
    const refCommand = `booking-${booking.id}`;

    const paytechResponse = await fetch(PAYTECH_REQUEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        API_KEY: Deno.env.get('PAYTECH_API_KEY')!,
        API_SECRET: Deno.env.get('PAYTECH_API_SECRET')!,
      },
      body: JSON.stringify({
        item_name: 'Réservation WTS Covoiturage',
        item_price: amount,
        currency: 'XOF',
        ref_command: refCommand,
        command_name: `Réservation ${refCommand}`,
        env: Deno.env.get('PAYTECH_ENV') ?? 'test',
        ipn_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/paytech-ipn`,
        success_url: Deno.env.get('APP_PAYMENT_SUCCESS_URL') ?? 'wtscovoiturage://booking/confirmation',
        cancel_url: Deno.env.get('APP_PAYMENT_CANCEL_URL') ?? 'wtscovoiturage://booking',
      }),
    });

    const paytechData = await paytechResponse.json();

    if (!paytechResponse.ok || !paytechData.redirect_url) {
      return jsonResponse({ error: 'Échec de l’initialisation du paiement PayTech', details: paytechData }, 502);
    }

    await supabaseAdmin.from('payments').insert({
      booking_id: booking.id,
      amount,
      commission_amount: Math.round(amount * 0.15), // taux à confirmer, voir spec section 7.1
      driver_payout_amount: amount - Math.round(amount * 0.15),
      paytech_transaction_id: paytechData.token ?? refCommand,
      status: 'pending',
    });

    return jsonResponse({ paymentUrl: paytechData.redirect_url });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Erreur inconnue' }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
