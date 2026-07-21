import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppText, Button, ScreenContainer } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function BookingConfirmationScreen() {
  return (
    <ScreenContainer>
      <Ionicons
        name="checkmark-circle"
        size={64}
        color={colors.gold}
        style={{ alignSelf: 'center', marginTop: spacing.xxl }}
      />
      <AppText variant="h2" color={colors.primary} style={{ textAlign: 'center', marginTop: spacing.md }}>
        Réservation confirmée
      </AppText>
      <AppText variant="body" color={colors.textSecondary} style={{ textAlign: 'center' }}>
        Vous pouvez dès maintenant contacter votre conducteur depuis l'onglet Messages.
      </AppText>

      <Button label="Retour à l'accueil" onPress={() => router.replace('/(tabs)/search')} style={{ marginTop: spacing.xl }} />
    </ScreenContainer>
  );
}
