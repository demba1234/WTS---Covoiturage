import { Redirect } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme';

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  return <Redirect href={session ? '/(tabs)/search' : '/(auth)/sign-in'} />;
}
