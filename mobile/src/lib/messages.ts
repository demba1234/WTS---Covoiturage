import { supabase } from './supabase';
import type { Conversation, Message } from '@/types';

export async function getOrCreateConversation(otherUserId: string, iAmDriver: boolean): Promise<Conversation> {
  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;
  if (!me) throw new Error('Non authentifié');

  const driverId = iAmDriver ? me : otherUserId;
  const passengerId = iAmDriver ? otherUserId : me;

  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('driver_id', driverId)
    .eq('passenger_id', passengerId)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ driver_id: driverId, passenger_id: passengerId })
    .select()
    .single();

  if (error) throw error;
  return created;
}

export async function listMyConversations() {
  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;
  if (!me) throw new Error('Non authentifié');

  const { data, error } = await supabase
    .from('conversations')
    .select(
      `id, driver_id, passenger_id, created_at,
       driver:profiles!conversations_driver_id_fkey ( first_name, last_name ),
       passenger:profiles!conversations_passenger_id_fkey ( first_name, last_name )`
    )
    .or(`driver_id.eq.${me},passenger_id.eq.${me}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row: any) => {
    const isDriver = row.driver_id === me;
    const other = isDriver ? row.passenger : row.driver;
    return {
      id: row.id,
      otherName: [other?.first_name, other?.last_name].filter(Boolean).join(' ') || 'Utilisateur',
    };
  });
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(conversationId: string, content: string): Promise<Message> {
  const { data: userData } = await supabase.auth.getUser();
  const senderId = userData.user?.id;
  if (!senderId) throw new Error('Non authentifié');

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, content })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Abonnement Realtime aux nouveaux messages d'une conversation. Retourne une fonction de désabonnement. */
export function subscribeToMessages(conversationId: string, onInsert: (message: Message) => void) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(payload.new as Message)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
