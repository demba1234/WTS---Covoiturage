import { router } from 'expo-router';
import { AppText, Button, Card, ScreenContainer } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/theme';

export default function ProfileScreen() {
  const { session } = useAuth();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
  }

  return (
    <ScreenContainer>
      <AppText variant="h2" color={colors.primary}>
        Mon profil
      </AppText>
      <AppText variant="body" color={colors.textSecondary}>
        {session?.user.phone ?? 'Numéro non renseigné'}
      </AppText>

      <Card style={{ marginTop: spacing.lg }}>
        <AppText variant="bodyMedium">Devenir conducteur</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          Publiez vos trajets et proposez des places. L'upload des documents de vérification (CNI, permis, carte
          grise, assurance) sera ajouté avant l'ouverture au public ; en attendant, ajoutez votre véhicule pour
          tester la publication de trajets.
        </AppText>
        <Button label="Ajouter mon véhicule" variant="secondary" onPress={() => router.push('/vehicle/create')} />
        <Button label="Publier un trajet" variant="outline" onPress={() => router.push('/trip/create')} />
      </Card>

      <Button label="Se déconnecter" variant="outline" onPress={handleSignOut} style={{ marginTop: spacing.xl }} />
    </ScreenContainer>
  );
}
