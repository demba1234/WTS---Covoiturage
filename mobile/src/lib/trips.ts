import { supabase } from './supabase';
import type { PickupPoint, RecurrenceType, TripDirection, TripTemplate, Vehicle, Weekday } from '@/types';

export interface SearchResultTrip {
  occurrenceId: string;
  occurrenceDate: string;
  seatsAvailable: number;
  templateId: string;
  pricePerSeat: number;
  driverName: string;
  pickupPoints: PickupPoint[];
}

/**
 * Liste les prochaines occurrences réservables, avec le trajet, le
 * conducteur et les points de collecte associés (embedding PostgREST).
 * Le filtrage départ/destination reste côté client au MVP (recherche texte
 * sur les libellés de points de collecte) ; une vraie recherche géographique
 * viendra avec l'intégration Google Places / Directions.
 */
export async function searchUpcomingTrips(): Promise<SearchResultTrip[]> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('trip_occurrences')
    .select(
      `id, occurrence_date, seats_available, status,
       trip_template:trip_templates (
         id, price_per_seat,
         driver:profiles ( first_name, last_name ),
         pickup_points ( id, trip_template_id, sequence_order, label, address, lat, lng, scheduled_time )
       )`
    )
    .eq('status', 'planifiee')
    .gte('occurrence_date', today)
    .gt('seats_available', 0)
    .order('occurrence_date', { ascending: true })
    .limit(30);

  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const template = row.trip_template;
    const driver = template?.driver;
    const pickupPoints: PickupPoint[] = (template?.pickup_points ?? []).sort(
      (a: PickupPoint, b: PickupPoint) => a.sequence_order - b.sequence_order
    );

    return {
      occurrenceId: row.id,
      occurrenceDate: row.occurrence_date,
      seatsAvailable: row.seats_available,
      templateId: template?.id,
      pricePerSeat: template?.price_per_seat,
      driverName: [driver?.first_name, driver?.last_name].filter(Boolean).join(' ') || 'Conducteur',
      pickupPoints,
    };
  });
}

export async function getOccurrenceDetail(occurrenceId: string) {
  const { data, error } = await supabase
    .from('trip_occurrences')
    .select(
      `id, occurrence_date, seats_available, status,
       trip_template:trip_templates (
         id, price_per_seat, direction,
         driver:profiles ( first_name, last_name ),
         vehicle:vehicles ( brand, model, color ),
         pickup_points ( id, trip_template_id, sequence_order, label, address, lat, lng, scheduled_time )
       )`
    )
    .eq('id', occurrenceId)
    .single();

  if (error) throw error;
  return data;
}

export async function getMyVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createVehicle(input: {
  brand: string;
  model: string;
  color: string;
  plateNumber: string;
  seatsCapacity: number;
}): Promise<Vehicle> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Non authentifié');

  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      user_id: userId,
      brand: input.brand,
      model: input.model,
      color: input.color,
      plate_number: input.plateNumber,
      seats_capacity: input.seatsCapacity,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export interface CreateTripInput {
  vehicleId: string;
  direction: TripDirection;
  recurrenceType: RecurrenceType;
  recurrenceDays: Weekday[];
  validFrom: string; // YYYY-MM-DD
  pricePerSeat: number;
  seatsTotal: number;
  pickupPoints: { label: string; address: string; lat: number; lng: number; scheduledTime: string }[];
}

/**
 * Crée le gabarit de trajet, ses points de collecte, puis matérialise les
 * occurrences réservables via la fonction RPC generate_trip_occurrences.
 */
export async function createTrip(input: CreateTripInput): Promise<TripTemplate> {
  const { data: userData } = await supabase.auth.getUser();
  const driverId = userData.user?.id;
  if (!driverId) throw new Error('Non authentifié');

  const { data: template, error: templateError } = await supabase
    .from('trip_templates')
    .insert({
      driver_id: driverId,
      vehicle_id: input.vehicleId,
      direction: input.direction,
      recurrence_type: input.recurrenceType,
      recurrence_days: input.recurrenceDays,
      valid_from: input.validFrom,
      price_per_seat: input.pricePerSeat,
      seats_total: input.seatsTotal,
    })
    .select()
    .single();

  if (templateError) throw templateError;

  const { error: pointsError } = await supabase.from('pickup_points').insert(
    input.pickupPoints.map((point, index) => ({
      trip_template_id: template.id,
      sequence_order: index,
      label: point.label,
      address: point.address,
      lat: point.lat,
      lng: point.lng,
      scheduled_time: point.scheduledTime,
    }))
  );

  if (pointsError) throw pointsError;

  const { error: occurrencesError } = await supabase.rpc('generate_trip_occurrences', {
    p_trip_template_id: template.id,
  });

  if (occurrencesError) throw occurrencesError;

  return template;
}

export async function getMyTripTemplates(): Promise<TripTemplate[]> {
  const { data, error } = await supabase
    .from('trip_templates')
    .select('*, pickup_points ( id, trip_template_id, sequence_order, label, address, lat, lng, scheduled_time )')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
