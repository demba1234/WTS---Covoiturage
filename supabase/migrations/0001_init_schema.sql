-- WTS Covoiturage — schéma initial
-- Reflète le modèle de données de la spécification fonctionnelle
-- (docs/specification-fonctionnelle-mvp.md, section 5).
--
-- Notes :
-- - "profiles" étend auth.users (Supabase Auth gère déjà le téléphone via OTP).
-- - Les écritures sensibles (décrément atomique des places, confirmation de
--   paiement, remboursements) sont destinées à passer par des Edge Functions
--   avec la clé service_role, pas par des policies RLS côté client — cette
--   première version de RLS couvre donc surtout la lecture et les cas simples.

create extension if not exists "pgcrypto";

-- ==========================================================================
-- Types énumérés
-- ==========================================================================

create type driver_status as enum ('none', 'pending', 'verified', 'rejected', 'suspended');
create type verification_status as enum ('pending', 'approved', 'rejected');
create type trip_direction as enum ('aller', 'retour');
create type recurrence_type as enum ('ponctuel', 'recurrent');
create type trip_template_status as enum ('actif', 'inactif');
create type occurrence_status as enum ('planifiee', 'terminee', 'annulee');
create type booking_status as enum (
  'en_attente_paiement',
  'confirmee',
  'terminee',
  'annulee_passager',
  'annulee_conducteur',
  'no_show'
);
create type payment_status as enum ('pending', 'success', 'failed', 'refunded', 'partially_refunded');
create type payment_method as enum ('carte', 'wave', 'orange_money');
create type payout_status as enum ('pending', 'paid');
create type admin_role as enum ('super_admin', 'support', 'finance');
create type weekday as enum ('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche');

-- ==========================================================================
-- Profils utilisateurs (étend auth.users)
-- ==========================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  photo_url text,
  role_passenger boolean not null default true,
  role_driver boolean not null default false,
  driver_status driver_status not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role admin_role not null default 'support',
  email text,
  created_at timestamptz not null default now()
);

create table public.driver_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  id_document_url text not null,
  license_url text not null,
  insurance_url text not null,
  insurance_expiry_date date not null,
  status verification_status not null default 'pending',
  reviewed_by uuid references public.admin_users (id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

-- ==========================================================================
-- Véhicules
-- ==========================================================================

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  brand text not null,
  model text not null,
  color text not null,
  plate_number text not null,
  registration_doc_url text,
  seats_capacity smallint not null check (seats_capacity > 0),
  created_at timestamptz not null default now()
);

-- ==========================================================================
-- Trajets : gabarit, points de collecte, occurrences
-- ==========================================================================

create table public.trip_templates (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete restrict,
  direction trip_direction not null,
  linked_trip_template_id uuid references public.trip_templates (id),
  recurrence_type recurrence_type not null,
  recurrence_days weekday[] not null default '{}',
  valid_from date not null,
  valid_until date,
  price_per_seat numeric(10, 2) not null check (price_per_seat >= 0),
  seats_total smallint not null check (seats_total > 0),
  status trip_template_status not null default 'actif',
  created_at timestamptz not null default now()
);

create table public.pickup_points (
  id uuid primary key default gen_random_uuid(),
  trip_template_id uuid not null references public.trip_templates (id) on delete cascade,
  sequence_order smallint not null,
  label text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  scheduled_time time not null,
  unique (trip_template_id, sequence_order)
);

create table public.trip_occurrences (
  id uuid primary key default gen_random_uuid(),
  trip_template_id uuid not null references public.trip_templates (id) on delete cascade,
  occurrence_date date not null,
  seats_available smallint not null,
  status occurrence_status not null default 'planifiee',
  cancelled_reason text,
  created_at timestamptz not null default now(),
  unique (trip_template_id, occurrence_date)
);

-- ==========================================================================
-- Réservations, paiements, versements conducteur
-- ==========================================================================

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null references public.trip_occurrences (id) on delete cascade,
  passenger_id uuid not null references public.profiles (id) on delete cascade,
  pickup_point_id uuid not null references public.pickup_points (id),
  dropoff_point_id uuid not null references public.pickup_points (id),
  seats_count smallint not null check (seats_count > 0),
  status booking_status not null default 'en_attente_paiement',
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  amount numeric(10, 2) not null,
  commission_amount numeric(10, 2) not null,
  driver_payout_amount numeric(10, 2) not null,
  paytech_transaction_id text,
  payment_method payment_method,
  status payment_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  total_amount numeric(10, 2) not null,
  status payout_status not null default 'pending',
  paid_at timestamptz
);

-- ==========================================================================
-- Messagerie
-- ==========================================================================

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  passenger_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (driver_id, passenger_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  booking_id uuid references public.bookings (id),
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- ==========================================================================
-- Index
-- ==========================================================================

create index idx_trip_occurrences_template_date on public.trip_occurrences (trip_template_id, occurrence_date);
create index idx_trip_templates_driver on public.trip_templates (driver_id);
create index idx_pickup_points_template on public.pickup_points (trip_template_id);
create index idx_bookings_occurrence on public.bookings (occurrence_id);
create index idx_bookings_passenger on public.bookings (passenger_id);
create index idx_payments_booking on public.payments (booking_id);
create index idx_messages_conversation_created on public.messages (conversation_id, created_at);

-- ==========================================================================
-- Fonctions et triggers utilitaires
-- ==========================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Crée automatiquement un profil applicatif à l'inscription (Supabase Auth).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, created_at)
  values (new.id, now())
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ==========================================================================
-- Row Level Security
-- ==========================================================================

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.driver_verifications enable row level security;
alter table public.trip_templates enable row level security;
alter table public.pickup_points enable row level security;
alter table public.trip_occurrences enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.payouts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- profiles : lecture publique (nécessaire pour afficher le conducteur dans
-- les résultats de recherche), écriture réservée au propriétaire.
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- vehicles : lecture publique, écriture réservée au conducteur propriétaire.
create policy "vehicles_select_all" on public.vehicles for select using (true);
create policy "vehicles_all_own" on public.vehicles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- driver_verifications : visible et modifiable uniquement par son auteur
-- (la validation/le rejet par un admin passe par la clé service_role).
create policy "driver_verifications_select_own" on public.driver_verifications
  for select using (auth.uid() = user_id);
create policy "driver_verifications_insert_own" on public.driver_verifications
  for insert with check (auth.uid() = user_id);

-- trip_templates : lecture publique des trajets actifs, écriture réservée
-- au conducteur propriétaire.
create policy "trip_templates_select_active" on public.trip_templates
  for select using (status = 'actif' or driver_id = auth.uid());
create policy "trip_templates_all_own" on public.trip_templates for all
  using (auth.uid() = driver_id) with check (auth.uid() = driver_id);

-- pickup_points : lecture publique, écriture réservée au conducteur du
-- trajet parent.
create policy "pickup_points_select_all" on public.pickup_points for select using (true);
create policy "pickup_points_all_own" on public.pickup_points for all
  using (exists (
    select 1 from public.trip_templates t
    where t.id = trip_template_id and t.driver_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.trip_templates t
    where t.id = trip_template_id and t.driver_id = auth.uid()
  ));

-- trip_occurrences : lecture publique, écriture réservée au conducteur du
-- trajet parent (la décrémentation des places passe par une Edge Function).
create policy "trip_occurrences_select_all" on public.trip_occurrences for select using (true);
create policy "trip_occurrences_all_own" on public.trip_occurrences for all
  using (exists (
    select 1 from public.trip_templates t
    where t.id = trip_template_id and t.driver_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.trip_templates t
    where t.id = trip_template_id and t.driver_id = auth.uid()
  ));

-- bookings : visible par le passager concerné et par le conducteur du
-- trajet ; création/modification réservées au passager (statut détaillé
-- géré côté Edge Function pour les transitions sensibles).
create policy "bookings_select_passenger" on public.bookings
  for select using (auth.uid() = passenger_id);
create policy "bookings_select_driver" on public.bookings
  for select using (exists (
    select 1 from public.trip_occurrences o
    join public.trip_templates t on t.id = o.trip_template_id
    where o.id = occurrence_id and t.driver_id = auth.uid()
  ));
create policy "bookings_insert_passenger" on public.bookings
  for insert with check (auth.uid() = passenger_id);
create policy "bookings_update_passenger" on public.bookings
  for update using (auth.uid() = passenger_id);

-- payments : lecture réservée au passager de la réservation concernée.
-- L'insertion/mise à jour se fait via Edge Function (service_role) suite
-- au callback PayTech, donc pas de policy d'écriture côté client.
create policy "payments_select_own" on public.payments
  for select using (exists (
    select 1 from public.bookings b where b.id = booking_id and b.passenger_id = auth.uid()
  ));

-- payouts : lecture réservée au conducteur concerné.
create policy "payouts_select_own" on public.payouts
  for select using (auth.uid() = driver_id);

-- conversations : visibles et créables par les deux participants.
create policy "conversations_select_participants" on public.conversations
  for select using (auth.uid() = driver_id or auth.uid() = passenger_id);
create policy "conversations_insert_participants" on public.conversations
  for insert with check (auth.uid() = driver_id or auth.uid() = passenger_id);

-- messages : visibles et créables par les participants de la conversation.
create policy "messages_select_participants" on public.messages
  for select using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.driver_id = auth.uid() or c.passenger_id = auth.uid())
  ));
create policy "messages_insert_participants" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.driver_id = auth.uid() or c.passenger_id = auth.uid())
    )
  );
