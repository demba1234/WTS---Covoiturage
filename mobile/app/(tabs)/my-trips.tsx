import { AppText, Card, ScreenContainer } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function MyTripsScreen() {
  return (
    <ScreenContainer scroll>
      <AppText variant="h2" color={colors.primary}>
        Mes trajets
      </AppText>
      <AppText variant="body" color={colors.textSecondary}>
        Vos réservations et, si vous êtes conducteur vérifié, les trajets que vous publiez.
      </AppText>

      <Card style={{ marginTop: spacing.lg }}>
        <AppText variant="bodyMedium">Aucune réservation pour le moment</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          Les trajets que vous réservez apparaîtront ici, classés par date de départ.
        </AppText>
      </Card>
    </ScreenContainer>
  );
}
