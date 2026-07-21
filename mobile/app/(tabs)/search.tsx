import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList } from 'react-native';
import { AppText, Button, Card, ScreenContainer, TextField } from '@/components/ui';
import { colors, spacing } from '@/theme';

// Données factices en attendant la connexion à trip_occurrences via Supabase.
const MOCK_RESULTS = [
  { id: '1', driver: 'Moussa D.', from: 'Liberté 6', to: 'Plateau', time: '07:30', price: 1500, seatsLeft: 2 },
  { id: '2', driver: 'Aïssatou N.', from: 'Ouakam', to: 'Point E', time: '08:00', price: 1200, seatsLeft: 1 },
];

export default function SearchScreen() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  return (
    <ScreenContainer>
      <AppText variant="h2" color={colors.primary}>
        Trouver un trajet
      </AppText>

      <TextField label="Départ" value={from} onChangeText={setFrom} placeholder="Ex : Liberté 6" />
      <TextField label="Destination" value={to} onChangeText={setTo} placeholder="Ex : Plateau" />
      <Button label="Rechercher" onPress={() => {}} style={{ marginTop: spacing.xs }} />

      <AppText variant="h3" style={{ marginTop: spacing.lg }}>
        Trajets disponibles
      </AppText>

      <FlatList
        data={MOCK_RESULTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xl }}
        renderItem={({ item }) => (
          <Card style={{ marginTop: spacing.sm }} onPress={() => router.push({ pathname: '/trip/[id]', params: { id: item.id } })}>
            <AppText variant="bodyMedium">
              {item.from} → {item.to}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {item.driver} · Départ {item.time} · {item.seatsLeft} place(s) restante(s)
            </AppText>
            <AppText variant="bodyMedium" color={colors.gold}>
              {item.price} FCFA
            </AppText>
          </Card>
        )}
      />
    </ScreenContainer>
  );
}
