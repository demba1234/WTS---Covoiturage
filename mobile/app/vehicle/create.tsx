import { router } from 'expo-router';
import { useState } from 'react';
import { AppText, Button, ScreenContainer, TextField } from '@/components/ui';
import { createVehicle } from '@/lib/trips';
import { colors, spacing } from '@/theme';

export default function CreateVehicleScreen() {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [seats, setSeats] = useState('3');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await createVehicle({
        brand,
        model,
        color,
        plateNumber,
        seatsCapacity: Number(seats) || 1,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <AppText variant="h2" color={colors.primary}>
        Ajouter un véhicule
      </AppText>
      <AppText variant="body" color={colors.textSecondary}>
        Nécessaire avant de publier un trajet.
      </AppText>

      <TextField label="Marque" value={brand} onChangeText={setBrand} placeholder="Ex : Toyota" style={{ marginTop: spacing.lg }} />
      <TextField label="Modèle" value={model} onChangeText={setModel} placeholder="Ex : Corolla" />
      <TextField label="Couleur" value={color} onChangeText={setColor} placeholder="Ex : Gris" />
      <TextField label="Immatriculation" value={plateNumber} onChangeText={setPlateNumber} placeholder="DK-0000-AA" />
      <TextField label="Nombre de places passagers" value={seats} onChangeText={setSeats} keyboardType="numeric" placeholder="3" />

      {error ? (
        <AppText variant="caption" color={colors.error}>
          {error}
        </AppText>
      ) : null}

      <Button label="Enregistrer" onPress={handleSubmit} loading={submitting} style={{ marginTop: spacing.lg }} />
    </ScreenContainer>
  );
}
