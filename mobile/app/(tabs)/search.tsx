import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, FlatList } from 'react-native';
import { AppText, Button, Card, ScreenContainer, TextField } from '@/components/ui';
import { searchUpcomingTrips, SearchResultTrip } from '@/lib/trips';
import { colors, spacing } from '@/theme';

export default function SearchScreen() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [trips, setTrips] = useState<SearchResultTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await searchUpcomingTrips();
      setTrips(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = trips.filter((trip) => {
    const labels = trip.pickupPoints.map((p) => `${p.label} ${p.address}`.toLowerCase()).join(' ');
    const matchesFrom = from.trim() === '' || labels.includes(from.trim().toLowerCase());
    const matchesTo = to.trim() === '' || labels.includes(to.trim().toLowerCase());
    return matchesFrom && matchesTo;
  });

  return (
    <ScreenContainer>
      <AppText variant="h2" color={colors.primary}>
        Trouver un trajet
      </AppText>

      <TextField label="Départ" value={from} onChangeText={setFrom} placeholder="Ex : Liberté 6" />
      <TextField label="Destination" value={to} onChangeText={setTo} placeholder="Ex : Plateau" />
      <Button label="Rechercher" onPress={load} style={{ marginTop: spacing.xs }} />

      <AppText variant="h3" style={{ marginTop: spacing.lg }}>
        Trajets disponibles
      </AppText>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : error ? (
        <AppText variant="caption" color={colors.error} style={{ marginTop: spacing.sm }}>
          {error}
        </AppText>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.occurrenceId}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xl }}
          ListEmptyComponent={
            <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
              Aucun trajet disponible pour le moment.
            </AppText>
          }
          renderItem={({ item }) => {
            const departure = item.pickupPoints[0];
            const arrival = item.pickupPoints[item.pickupPoints.length - 1];
            return (
              <Card
                style={{ marginTop: spacing.sm }}
                onPress={() => router.push({ pathname: '/trip/[id]', params: { id: item.occurrenceId } })}
              >
                <AppText variant="bodyMedium">
                  {departure?.label} → {arrival?.label}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {item.driverName} · Départ {departure?.scheduled_time?.slice(0, 5)} ·{' '}
                  {item.seatsAvailable} place(s) restante(s)
                </AppText>
                <AppText variant="bodyMedium" color={colors.gold}>
                  {item.pricePerSeat} FCFA
                </AppText>
              </Card>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}
