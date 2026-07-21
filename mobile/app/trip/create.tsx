import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppText, Button, Card, ScreenContainer, TextField } from '@/components/ui';
import { createTrip, getMyVehicles } from '@/lib/trips';
import { colors, spacing } from '@/theme';
import type { RecurrenceType, Vehicle, Weekday } from '@/types';

const WEEKDAYS: Weekday[] = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const WEEKDAY_LABELS: Record<Weekday, string> = {
  lundi: 'Lun',
  mardi: 'Mar',
  mercredi: 'Mer',
  jeudi: 'Jeu',
  vendredi: 'Ven',
  samedi: 'Sam',
  dimanche: 'Dim',
};

export default function CreateTripScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [fromLabel, setFromLabel] = useState('');
  const [toLabel, setToLabel] = useState('');
  const [time, setTime] = useState('07:30');
  const [price, setPrice] = useState('');
  const [seats, setSeats] = useState('');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('recurrent');
  const [selectedDays, setSelectedDays] = useState<Weekday[]>(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyVehicles()
      .then(setVehicles)
      .catch(() => setVehicles([]));
  }, []);

  function toggleDay(day: Weekday) {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  async function handleSubmit() {
    if (!vehicles || vehicles.length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      await createTrip({
        vehicleId: vehicles[0].id,
        direction: 'aller',
        recurrenceType,
        recurrenceDays: recurrenceType === 'recurrent' ? selectedDays : [],
        validFrom: date,
        pricePerSeat: Number(price) || 0,
        seatsTotal: Number(seats) || 1,
        pickupPoints: [
          { label: fromLabel, address: fromLabel, lat: 0, lng: 0, scheduledTime: `${time}:00` },
          { label: toLabel, address: toLabel, lat: 0, lng: 0, scheduledTime: `${time}:00` },
        ],
      });
      router.push('/(tabs)/my-trips');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la publication');
    } finally {
      setSubmitting(false);
    }
  }

  if (vehicles !== null && vehicles.length === 0) {
    return (
      <ScreenContainer>
        <AppText variant="h2" color={colors.primary}>
          Publier un trajet
        </AppText>
        <Card style={{ marginTop: spacing.lg }}>
          <AppText variant="bodyMedium">Aucun véhicule enregistré</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Ajoutez d'abord votre véhicule pour pouvoir publier un trajet.
          </AppText>
          <Button label="Ajouter un véhicule" onPress={() => router.push('/vehicle/create')} />
        </Card>
      </ScreenContainer>
    );
  }

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
        value={fromLabel}
        onChangeText={setFromLabel}
        placeholder="Ex : Liberté 6"
        style={{ marginTop: spacing.lg }}
      />
      <TextField label="Point d'arrivée" value={toLabel} onChangeText={setToLabel} placeholder="Ex : Plateau" />
      <TextField label="Heure de départ (HH:mm)" value={time} onChangeText={setTime} placeholder="07:30" />
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

      <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
        Récurrence
      </AppText>
      <Card style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          label="Ponctuel"
          variant={recurrenceType === 'ponctuel' ? 'primary' : 'outline'}
          onPress={() => setRecurrenceType('ponctuel')}
          style={{ flex: 1 }}
        />
        <Button
          label="Récurrent"
          variant={recurrenceType === 'recurrent' ? 'primary' : 'outline'}
          onPress={() => setRecurrenceType('recurrent')}
          style={{ flex: 1 }}
        />
      </Card>

      {recurrenceType === 'ponctuel' ? (
        <TextField label="Date (AAAA-MM-JJ)" value={date} onChangeText={setDate} placeholder="2026-08-01" />
      ) : (
        <Card style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {WEEKDAYS.map((day) => (
            <Button
              key={day}
              label={WEEKDAY_LABELS[day]}
              variant={selectedDays.includes(day) ? 'secondary' : 'outline'}
              onPress={() => toggleDay(day)}
              style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }}
            />
          ))}
        </Card>
      )}

      {error ? (
        <AppText variant="caption" color={colors.error}>
          {error}
        </AppText>
      ) : null}

      <Button label="Publier le trajet" onPress={handleSubmit} loading={submitting} style={{ marginTop: spacing.lg }} />
    </ScreenContainer>
  );
}
