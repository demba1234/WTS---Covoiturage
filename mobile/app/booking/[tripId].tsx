import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { AppText, Button, Card, ScreenContainer } from '@/components/ui';
import { colors, spacing } from '@/theme';

const MOCK_PICKUP_POINTS = ['Liberté 6 - Pharmacie', 'Sacré-Cœur 3 - Rond-point', 'Plateau - Terminus'];

export default function BookingScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);

  return (
    <ScreenContainer scroll>
      <AppText variant="h2" color={colors.primary}>
        Réserver une place
      </AppText>
      <AppText variant="body" color={colors.textSecondary}>
        Trajet #{tripId}
      </AppText>

      <AppText variant="h3" style={{ marginTop: spacing.lg }}>
        Choisissez votre point de collecte
      </AppText>

      {MOCK_PICKUP_POINTS.map((point) => (
        <Card
          key={point}
          onPress={() => setSelectedPoint(point)}
          style={{
            marginTop: spacing.sm,
            borderColor: selectedPoint === point ? colors.primary : colors.border,
          }}
        >
          <AppText variant="bodyMedium">{point}</AppText>
        </Card>
      ))}

      <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
        Le paiement PayTech (carte, Wave, Orange Money) sera déclenché ici, avant confirmation définitive de la
        réservation.
      </AppText>

      <Button
        label="Confirmer et payer"
        onPress={() => router.push('/booking/confirmation')}
        disabled={!selectedPoint}
        style={{ marginTop: spacing.lg }}
      />
    </ScreenContainer>
  );
}
