import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { AppText, Button, ScreenContainer, TextField } from '@/components/ui';
import { colors, spacing } from '@/theme';

interface LocalMessage {
  id: string;
  fromMe: boolean;
  content: string;
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<LocalMessage[]>([
    { id: '1', fromMe: false, content: 'Bonjour, je serai devant la pharmacie à 7h30.' },
  ]);
  const [draft, setDraft] = useState('');

  function handleSend() {
    if (!draft.trim()) return;
    setMessages((prev) => [...prev, { id: Date.now().toString(), fromMe: true, content: draft.trim() }]);
    setDraft('');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenContainer>
        <AppText variant="h2" color={colors.primary}>
          Conversation #{id}
        </AppText>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.md }}
          renderItem={({ item }) => (
            <AppText
              variant="body"
              style={{
                alignSelf: item.fromMe ? 'flex-end' : 'flex-start',
                backgroundColor: item.fromMe ? colors.primary : colors.surface,
                color: item.fromMe ? colors.textOnPrimary : colors.textPrimary,
                borderRadius: 12,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                overflow: 'hidden',
                maxWidth: '80%',
              }}
            >
              {item.content}
            </AppText>
          )}
        />

        <TextField value={draft} onChangeText={setDraft} placeholder="Écrire un message..." onSubmitEditing={handleSend} />
        <Button label="Envoyer" onPress={handleSend} style={{ marginTop: spacing.sm }} />
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
