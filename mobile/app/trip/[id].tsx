import { router, useLocalSearchParams } from 'expo-router';
import { AppText, Button, Card, ScreenContainer } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScreenContainer scroll>
      <AppText variant="h2" color={colors.primary}>
        Détail du trajet
      </AppText>

      <Card style={{ marginTop: spacing.md }}>
        <AppText variant="bodyMedium">Trajet #{id}</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          Points de collecte, horaires, conducteur et véhicule s'afficheront ici une fois la lecture Supabase
          (trip_occurrences + pickup_points) branchée.
        </AppText>
      </Card>

      <Button
        label="Réserver une place"
        onPress={() => router.push({ pathname: '/booking/[tripId]', params: { tripId: id } })}
        style={{ marginTop: spacing.lg }}
      />
    </ScreenContainer>
  );
}
