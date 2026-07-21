-- WTS Covoiturage — fonctions métier
--
-- Ces fonctions RPC (SECURITY DEFINER) encapsulent les écritures sensibles
-- qui doivent rester atomiques ou traverser plusieurs tables protégées par
-- des RLS différentes : réservation avec décrément de place (pas de
-- surbooking même en cas de réservations simultanées), annulation avec
-- restitution de la place, génération des occurrences d'un trajet
-- récurrent. Elles vérifient elles-mêmes auth.uid() puisqu'elles
-- contournent la RLS des tables sous-jacentes.

-- ==========================================================================
-- book_occurrence : réserve N places sur une occurrence, de façon atomique.
-- ==========================================================================

create or replace function public.book_occurrence(
  p_occurrence_id uuid,
  p_pickup_point_id uuid,
  p_dropoff_point_id uuid,
  p_seats_count smallint
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_updated_rows int;
begin
  if p_seats_count <= 0 then
    raise exception 'Le nombre de places doit être positif';
  end if;

  -- Décrément conditionnel en une seule instruction : si deux passagers
  -- réservent la dernière place au même instant, un seul UPDATE affectera
  -- une ligne (seats_available >= p_seats_count échouera pour l'autre).
  update public.trip_occurrences
  set seats_available = seats_available - p_seats_count
  where id = p_occurrence_id
    and status = 'planifiee'
    and seats_available >= p_seats_count;

  get diagnostics v_updated_rows = row_count;

  if v_updated_rows = 0 then
    raise exception 'Plus assez de places disponibles sur ce trajet';
  end if;

  insert into public.bookings (
    occurrence_id, passenger_id, pickup_point_id, dropoff_point_id, seats_count, status
  ) values (
    p_occurrence_id, auth.uid(), p_pickup_point_id, p_dropoff_point_id, p_seats_count, 'en_attente_paiement'
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

grant execute on function public.book_occurrence(uuid, uuid, uuid, smallint) to authenticated;

-- ==========================================================================
-- cancel_booking : annule une réservation (passager ou conducteur) et
-- restitue les places si elles avaient été décomptées.
-- ==========================================================================

create or replace function public.cancel_booking(
  p_booking_id uuid,
  p_as_driver boolean default false
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_driver_id uuid;
  v_new_status booking_status;
begin
  select b.* into v_booking from public.bookings b where b.id = p_booking_id;

  if v_booking is null then
    raise exception 'Réservation introuvable';
  end if;

  select t.driver_id into v_driver_id
  from public.trip_occurrences o
  join public.trip_templates t on t.id = o.trip_template_id
  where o.id = v_booking.occurrence_id;

  if p_as_driver then
    if v_driver_id <> auth.uid() then
      raise exception 'Non autorisé';
    end if;
    v_new_status := 'annulee_conducteur';
  else
    if v_booking.passenger_id <> auth.uid() then
      raise exception 'Non autorisé';
    end if;
    v_new_status := 'annulee_passager';
  end if;

  if v_booking.status in ('en_attente_paiement', 'confirmee') then
    update public.trip_occurrences
    set seats_available = seats_available + v_booking.seats_count
    where id = v_booking.occurrence_id;
  end if;

  update public.bookings
  set status = v_new_status, cancelled_at = now()
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;

grant execute on function public.cancel_booking(uuid, boolean) to authenticated;

-- ==========================================================================
-- generate_trip_occurrences : matérialise les occurrences d'un trajet.
-- Ponctuel -> une occurrence à valid_from.
-- Récurrent -> une occurrence par jour de la semaine concerné, sur un
-- horizon glissant (par défaut 4 semaines), à rappeler périodiquement
-- (ex. cron hebdomadaire) pour repousser l'horizon dans le temps.
-- ==========================================================================

create or replace function public.generate_trip_occurrences(
  p_trip_template_id uuid,
  p_horizon_weeks int default 4
)
returns setof public.trip_occurrences
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trip_templates;
  v_day date;
  v_end date;
  v_horizon_end date;
  v_map constant weekday[] := array['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
begin
  select * into v_trip from public.trip_templates where id = p_trip_template_id;

  if v_trip is null then
    raise exception 'Trajet introuvable';
  end if;

  if v_trip.driver_id <> auth.uid() then
    raise exception 'Non autorisé';
  end if;

  if v_trip.recurrence_type = 'ponctuel' then
    return query
      insert into public.trip_occurrences (trip_template_id, occurrence_date, seats_available)
      values (v_trip.id, v_trip.valid_from, v_trip.seats_total)
      on conflict (trip_template_id, occurrence_date) do nothing
      returning *;
    return;
  end if;

  v_horizon_end := current_date + (p_horizon_weeks * 7);
  v_day := greatest(v_trip.valid_from, current_date);
  v_end := least(coalesce(v_trip.valid_until, v_horizon_end), v_horizon_end);

  return query
    insert into public.trip_occurrences (trip_template_id, occurrence_date, seats_available)
    select v_trip.id, d::date, v_trip.seats_total
    from generate_series(v_day, v_end, interval '1 day') as d
    where v_map[extract(dow from d)::int + 1] = any(v_trip.recurrence_days)
    on conflict (trip_template_id, occurrence_date) do nothing
    returning *;
end;
$$;

grant execute on function public.generate_trip_occurrences(uuid, int) to authenticated;
