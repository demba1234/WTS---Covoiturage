import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { AppText, Button, ScreenContainer, TextField } from '@/components/ui';
import { listMessages, sendMessage, subscribeToMessages } from '@/lib/messages';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/theme';
import type { Message } from '@/types';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!id) return;
    listMessages(id).then(setMessages);
    const unsubscribe = subscribeToMessages(id, (message) => {
      setMessages((prev) => [...prev, message]);
    });
    return unsubscribe;
  }, [id]);

  async function handleSend() {
    if (!draft.trim() || !id) return;
    const content = draft.trim();
    setDraft('');
    await sendMessage(id, content);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenContainer>
        <AppText variant="h2" color={colors.primary}>
          Conversation
        </AppText>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.md }}
          renderItem={({ item }) => {
            const fromMe = item.sender_id === myId;
            return (
              <AppText
                variant="body"
                style={{
                  alignSelf: fromMe ? 'flex-end' : 'flex-start',
                  backgroundColor: fromMe ? colors.primary : colors.surface,
                  color: fromMe ? colors.textOnPrimary : colors.textPrimary,
                  borderRadius: 12,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  overflow: 'hidden',
                  maxWidth: '80%',
                }}
              >
                {item.content}
              </AppText>
            );
          }}
        />

        <TextField value={draft} onChangeText={setDraft} placeholder="Écrire un message..." onSubmitEditing={handleSend} />
        <Button label="Envoyer" onPress={handleSend} style={{ marginTop: spacing.sm }} />
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
