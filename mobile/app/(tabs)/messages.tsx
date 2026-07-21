import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { AppText, Card, ScreenContainer } from '@/components/ui';
import { listMyConversations } from '@/lib/messages';
import { colors, spacing } from '@/theme';

interface ConversationItem {
  id: string;
  otherName: string;
}

export default function MessagesScreen() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      listMyConversations()
        .then((data) => {
          if (!cancelled) setConversations(data);
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
        Messages
      </AppText>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : error ? (
        <AppText variant="caption" color={colors.error} style={{ marginTop: spacing.sm }}>
          {error}
        </AppText>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.sm, marginTop: spacing.md }}
          ListEmptyComponent={
            <AppText variant="body" color={colors.textSecondary}>
              Vos conversations avec vos conducteurs ou passagers apparaîtront ici après une réservation confirmée.
            </AppText>
          }
          renderItem={({ item }) => (
            <Card onPress={() => router.push({ pathname: '/conversation/[id]', params: { id: item.id } })}>
              <AppText variant="bodyMedium">{item.otherName}</AppText>
            </Card>
          )}
        />
      )}
    </ScreenContainer>
  );
}
