-- release_occurrence_seats : restitue N places sur une occurrence.
-- Utilisée par l'Edge Function paytech-ipn lorsqu'un paiement échoue/est
-- annulé après qu'une réservation ait décompté les places (voir
-- book_occurrence dans 0002_booking_functions.sql). Contrairement à
-- cancel_booking, cette fonction ne vérifie pas auth.uid() car elle est
-- appelée par l'Edge Function avec la clé service_role (jamais depuis le
-- client mobile) — d'où l'absence de grant à "authenticated".

create or replace function public.release_occurrence_seats(
  p_occurrence_id uuid,
  p_seats_count smallint
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.trip_occurrences
  set seats_available = seats_available + p_seats_count
  where id = p_occurrence_id;
$$;

revoke execute on function public.release_occurrence_seats(uuid, smallint) from public, authenticated, anon;
grant execute on function public.release_occurrence_seats(uuid, smallint) to service_role;
