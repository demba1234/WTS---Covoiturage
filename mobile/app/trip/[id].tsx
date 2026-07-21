import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { AppText, Button, Card, ScreenContainer } from '@/components/ui';
import { getOccurrenceDetail } from '@/lib/trips';
import { colors, spacing } from '@/theme';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getOccurrenceDetail>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getOccurrenceDetail(id)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (error || !detail) {
    return (
      <ScreenContainer>
        <AppText variant="body" color={colors.error}>
          {error ?? 'Trajet introuvable'}
        </AppText>
      </ScreenContainer>
    );
  }

  const template = (detail as any).trip_template;
  const driver = template?.driver;
  const vehicle = template?.vehicle;
  const points = (template?.pickup_points ?? []).sort((a: any, b: any) => a.sequence_order - b.sequence_order);

  return (
    <ScreenContainer scroll>
      <AppText variant="h2" color={colors.primary}>
        Détail du trajet
      </AppText>

      <Card style={{ marginTop: spacing.md }}>
        <AppText variant="bodyMedium">
          {driver?.first_name} {driver?.last_name}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {vehicle?.brand} {vehicle?.model} · {vehicle?.color}
        </AppText>
        <AppText variant="bodyMedium" color={colors.gold}>
          {template?.price_per_seat} FCFA / place · {detail.seats_available} place(s) restante(s)
        </AppText>
      </Card>

      <AppText variant="h3" style={{ marginTop: spacing.lg }}>
        Points de collecte
      </AppText>
      {points.map((point: any) => (
        <Card key={point.id} style={{ marginTop: spacing.sm }}>
          <AppText variant="bodyMedium">{point.label}</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {point.address} · {point.scheduled_time?.slice(0, 5)}
          </AppText>
        </Card>
      ))}

      <Button
        label="Réserver une place"
        onPress={() => router.push({ pathname: '/booking/[tripId]', params: { tripId: detail.id } })}
        style={{ marginTop: spacing.lg }}
        disabled={detail.seats_available <= 0}
      />
    </ScreenContainer>
  );
}
