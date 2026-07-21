import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { AppText, Button, Card, ScreenContainer } from '@/components/ui';
import { getMyBookings } from '@/lib/bookings';
import { colors, spacing } from '@/theme';

export default function MyTripsScreen() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      getMyBookings()
        .then((data) => {
          if (!cancelled) setBookings(data);
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return (
    <ScreenContainer>
      <AppText variant="h2" color={colors.primary}>
        Mes trajets
      </AppText>
      <AppText variant="body" color={colors.textSecondary}>
        Vos réservations passagers. Pour gérer vos trajets publiés en tant que conducteur, utilisez votre profil.
      </AppText>

      <Button
        label="Publier un trajet (conducteur)"
        variant="outline"
        onPress={() => router.push('/trip/create')}
        style={{ marginTop: spacing.md }}
      />

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : error ? (
        <AppText variant="caption" color={colors.error} style={{ marginTop: spacing.sm }}>
          {error}
        </AppText>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.sm, marginTop: spacing.md, paddingBottom: spacing.xl }}
          ListEmptyComponent={
            <Card>
              <AppText variant="bodyMedium">Aucune réservation pour le moment</AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                Les trajets que vous réservez apparaîtront ici, classés par date de réservation.
              </AppText>
            </Card>
          }
          renderItem={({ item }) => (
            <Card>
              <AppText variant="bodyMedium">
                {item.pickup_point?.label} → {item.dropoff_point?.label}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                {item.occurrence?.occurrence_date} · {item.seats_count} place(s) · {item.status}
              </AppText>
            </Card>
          )}
        />
      )}
    </ScreenContainer>
  );
}
