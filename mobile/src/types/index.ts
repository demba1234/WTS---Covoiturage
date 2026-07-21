/**
 * Modèles de domaine reflétant le schéma SQL (supabase/migrations/0001_init_schema.sql).
 * À remplacer/compléter par les types générés via `supabase gen types typescript`
 * une fois le projet Supabase lié.
 */

export type DriverStatus = 'none' | 'pending' | 'verified' | 'rejected' | 'suspended';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type TripDirection = 'aller' | 'retour';
export type RecurrenceType = 'ponctuel' | 'recurrent';
export type TripTemplateStatus = 'actif' | 'inactif';
export type OccurrenceStatus = 'planifiee' | 'terminee' | 'annulee';
export type BookingStatus =
  | 'en_attente_paiement'
  | 'confirmee'
  | 'terminee'
  | 'annulee_passager'
  | 'annulee_conducteur'
  | 'no_show';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded' | 'partially_refunded';
export type PaymentMethod = 'carte' | 'wave' | 'orange_money';
export type PayoutStatus = 'pending' | 'paid';
export type Weekday = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche';

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  photo_url: string | null;
  role_passenger: boolean;
  role_driver: boolean;
  driver_status: DriverStatus;
  created_at: string;
}

export interface DriverVerification {
  id: string;
  user_id: string;
  id_document_url: string;
  license_url: string;
  insurance_url: string;
  insurance_expiry_date: string;
  status: VerificationStatus;
  rejection_reason: string | null;
  created_at: string;
}

export interface Vehicle {
  id: string;
  user_id: string;
  brand: string;
  model: string;
  color: string;
  plate_number: string;
  registration_doc_url: string | null;
  seats_capacity: number;
}

export interface PickupPoint {
  id: string;
  trip_template_id: string;
  sequence_order: number;
  label: string;
  address: string;
  lat: number;
  lng: number;
  scheduled_time: string; // HH:mm
}

export interface TripTemplate {
  id: string;
  driver_id: string;
  vehicle_id: string;
  direction: TripDirection;
  linked_trip_template_id: string | null;
  recurrence_type: RecurrenceType;
  recurrence_days: Weekday[];
  valid_from: string;
  valid_until: string | null;
  price_per_seat: number;
  seats_total: number;
  status: TripTemplateStatus;
  pickup_points?: PickupPoint[];
}

export interface TripOccurrence {
  id: string;
  trip_template_id: string;
  occurrence_date: string;
  seats_available: number;
  status: OccurrenceStatus;
  cancelled_reason: string | null;
  trip_template?: TripTemplate;
}

export interface Booking {
  id: string;
  occurrence_id: string;
  passenger_id: string;
  pickup_point_id: string;
  dropoff_point_id: string;
  seats_count: number;
  status: BookingStatus;
  cancelled_at: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  commission_amount: number;
  driver_payout_amount: number;
  paytech_transaction_id: string | null;
  payment_method: PaymentMethod | null;
  status: PaymentStatus;
  created_at: string;
}

export interface Payout {
  id: string;
  driver_id: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  status: PayoutStatus;
  paid_at: string | null;
}

export interface Conversation {
  id: string;
  driver_id: string;
  passenger_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  booking_id: string | null;
  content: string;
  created_at: string;
  read_at: string | null;
}
