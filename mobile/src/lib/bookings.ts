import { supabase } from './supabase';
import type { Booking } from '@/types';

export interface BookOccurrenceInput {
  occurrenceId: string;
  pickupPointId: string;
  dropoffPointId: string;
  seatsCount: number;
}

/** Réservation atomique : voir supabase/migrations/0002_booking_functions.sql (book_occurrence). */
export async function bookOccurrence(input: BookOccurrenceInput): Promise<Booking> {
  const { data, error } = await supabase.rpc('book_occurrence', {
    p_occurrence_id: input.occurrenceId,
    p_pickup_point_id: input.pickupPointId,
    p_dropoff_point_id: input.dropoffPointId,
    p_seats_count: input.seatsCount,
  });

  if (error) throw error;
  return data;
}

export async function cancelBooking(bookingId: string, asDriver = false): Promise<Booking> {
  const { data, error } = await supabase.rpc('cancel_booking', {
    p_booking_id: bookingId,
    p_as_driver: asDriver,
  });

  if (error) throw error;
  return data;
}

export async function getMyBookings() {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `id, seats_count, status, created_at,
       occurrence:trip_occurrences (
         occurrence_date,
         trip_template:trip_templates ( price_per_seat, driver:profiles ( first_name, last_name ) )
       ),
       pickup_point:pickup_points!bookings_pickup_point_id_fkey ( label ),
       dropoff_point:pickup_points!bookings_dropoff_point_id_fkey ( label )`
    )
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
