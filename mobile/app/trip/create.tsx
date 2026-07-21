import { useState } from 'react';
import { AppText, Button, ScreenContainer, TextField } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function CreateTripScreen() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [time, setTime] = useState('');
  const [price, setPrice] = useState('');
  const [seats, setSeats] = useState('');

  return (
    <ScreenContainer scroll>
      <AppText variant="h2" color={colors.primary}>
        Publier un trajet
      </AppText>
      <AppText variant="body" color={colors.textSecondary}>
        Définissez vos points de collecte, vos horaires et le nombre de places disponibles. Le trajet retour se
        publie séparément.
      </AppText>

      <TextField
        label="Point de départ"
        value={from}
        onChangeText={setFrom}
        placeholder="Ex : Liberté 6"
        style={{ marginTop: spacing.lg }}
      />
      <TextField label="Point d'arrivée" value={to} onChangeText={setTo} placeholder="Ex : Plateau" />
      <TextField label="Heure de départ" value={time} onChangeText={setTime} placeholder="07:30" />
      <TextField
        label="Prix par place (FCFA)"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        placeholder="1500"
      />
      <TextField
        label="Nombre de places disponibles"
        value={seats}
        onChangeText={setSeats}
        keyboardType="numeric"
        placeholder="3"
      />

      <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
        Récurrence (ponctuel / lundi-vendredi) et points de collecte intermédiaires : à brancher sur Google Places
        Autocomplete et la table trip_templates.
      </AppText>

      <Button label="Publier le trajet" onPress={() => {}} style={{ marginTop: spacing.lg }} />
    </ScreenContainer>
  );
}
