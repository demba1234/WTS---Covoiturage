import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking } from 'react-native';
import { AppText, Button, Card, ScreenContainer } from '@/components/ui';
import { bookOccurrence } from '@/lib/bookings';
import { getOccurrenceDetail } from '@/lib/trips';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/theme';

export default function BookingScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getOccurrenceDetail>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;
    getOccurrenceDetail(tripId)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [tripId]);

  const points: any[] = ((detail as any)?.trip_template?.pickup_points ?? []).sort(
    (a: any, b: any) => a.sequence_order - b.sequence_order
  );
  const dropoffPoint = points[points.length - 1];

  async function handleConfirm() {
    if (!detail || !selectedPointId || !dropoffPoint) return;
    setSubmitting(true);
    setError(null);

    try {
      const booking = await bookOccurrence({
        occurrenceId: detail.id,
        pickupPointId: selectedPointId,
        dropoffPointId: dropoffPoint.id,
        seatsCount: 1,
      });

      // Déclenche le paiement PayTech (edge function paytech-init). Tant
      // que PAYTECH_API_KEY/PAYTECH_API_SECRET ne sont pas configurés côté
      // Supabase, cet appel échoue proprement : la réservation reste en
      // attente de paiement et on informe l'utilisateur au lieu de bloquer
      // la démo.
      try {
        const { data, error: fnError } = await supabase.functions.invoke('paytech-init', {
          body: { bookingId: booking.id },
        });
        if (fnError) throw fnError;
        if (data?.paymentUrl) {
          await Linking.openURL(data.paymentUrl);
        }
      } catch {
        setError(
          "Réservation enregistrée, en attente de paiement. Le paiement en ligne PayTech n'est pas encore configuré."
        );
      }

      router.push('/booking/confirmation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la réservation');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <AppText variant="h2" color={colors.primary}>
        Réserver une place
      </AppText>

      <AppText variant="h3" style={{ marginTop: spacing.lg }}>
        Choisissez votre point de collecte
      </AppText>

      {points.slice(0, -1).map((point) => (
        <Card
          key={point.id}
          onPress={() => setSelectedPointId(point.id)}
          style={{
            marginTop: spacing.sm,
            borderColor: selectedPointId === point.id ? colors.primary : colors.border,
          }}
        >
          <AppText variant="bodyMedium">{point.label}</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {point.scheduled_time?.slice(0, 5)}
          </AppText>
        </Card>
      ))}

      {error ? (
        <AppText variant="caption" color={colors.error} style={{ marginTop: spacing.md }}>
          {error}
        </AppText>
      ) : null}

      <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
        Le paiement PayTech (carte, Wave, Orange Money) sera déclenché ici une fois les clés de production
        configurées.
      </AppText>

      <Button
        label="Confirmer la réservation"
        onPress={handleConfirm}
        disabled={!selectedPointId || submitting}
        loading={submitting}
        style={{ marginTop: spacing.lg }}
      />
    </ScreenContainer>
  );
}
