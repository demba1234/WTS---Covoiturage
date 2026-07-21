import { router } from 'expo-router';
import { FlatList } from 'react-native';
import { AppText, Card, ScreenContainer } from '@/components/ui';
import { colors, spacing } from '@/theme';

const MOCK_CONVERSATIONS: { id: string; name: string; lastMessage: string }[] = [];

export default function MessagesScreen() {
  return (
    <ScreenContainer>
      <AppText variant="h2" color={colors.primary}>
        Messages
      </AppText>

      <FlatList
        data={MOCK_CONVERSATIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.sm, marginTop: spacing.md }}
        ListEmptyComponent={
          <AppText variant="body" color={colors.textSecondary}>
            Vos conversations avec vos conducteurs ou passagers apparaîtront ici après une réservation confirmée.
          </AppText>
        }
        renderItem={({ item }) => (
          <Card onPress={() => router.push({ pathname: '/conversation/[id]', params: { id: item.id } })}>
            <AppText variant="bodyMedium">{item.name}</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {item.lastMessage}
            </AppText>
          </Card>
        )}
      />
    </ScreenContainer>
  );
}
