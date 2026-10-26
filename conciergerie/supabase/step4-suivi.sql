-- WTS Conciergerie — étape 4 : suivi réel (espace concierge + mises à jour en direct)
-- À exécuter dans Supabase > SQL Editor, après step3-demandes.sql.

-- Qui est concierge ? (le rôle ne peut être posé que depuis le SQL Editor, jamais par l'app)
create or replace function public.is_concierge() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'concierge')
$$;
revoke all on function public.is_concierge() from public, anon;
grant execute on function public.is_concierge() to authenticated;

-- Le concierge voit toutes les demandes, tous les profils clients et toutes les pièces jointes.
drop policy if exists "demande: lecture concierge" on public.requests;
create policy "demande: lecture concierge" on public.requests for select to authenticated using (public.is_concierge());

drop policy if exists "profil: lecture concierge" on public.profiles;
create policy "profil: lecture concierge" on public.profiles for select to authenticated using (public.is_concierge());

drop policy if exists "documents: lecture concierge" on storage.objects;
create policy "documents: lecture concierge" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.is_concierge());

-- Le concierge fait avancer une demande : statut, notes de chaque étape, proposition.
-- Les dates de chaque étape sont posées par le serveur, jamais par le client.
create or replace function public.concierge_update_request(
  p_id uuid, p_step int, p_notes jsonb, p_proposal jsonb
) returns public.requests
language plpgsql security definer set search_path = public as $$
declare r public.requests; times jsonb; i int;
begin
  if not public.is_concierge() then raise exception 'Accès réservé au concierge'; end if;
  if p_step not between 0 and 3 then raise exception 'Statut invalide'; end if;
  if jsonb_typeof(p_notes) is distinct from 'array' or jsonb_array_length(p_notes) <> 4 then
    raise exception 'Notes invalides';
  end if;
  if p_step = 2 and (p_proposal is null or coalesce(p_proposal->>'t','') = '' or coalesce(p_proposal->>'p','') = '') then
    raise exception 'Une proposition (titre et prix) est nécessaire pour passer à « À valider »';
  end if;

  select step_times into times from public.requests where id = p_id;
  if times is null then raise exception 'Demande introuvable'; end if;
  for i in 0..3 loop
    if i <= p_step and (times->i) = 'null'::jsonb then times := jsonb_set(times, array[i::text], to_jsonb(now())); end if;
    if i > p_step then times := jsonb_set(times, array[i::text], 'null'::jsonb); end if;
  end loop;

  update public.requests
     set step = p_step, notes = p_notes, step_times = times,
         proposal = case when p_proposal is null or coalesce(p_proposal->>'t','') = '' then null else p_proposal end
   where id = p_id
   returning * into r;
  return r;
end $$;
revoke all on function public.concierge_update_request(uuid,int,jsonb,jsonb) from public, anon;
grant execute on function public.concierge_update_request(uuid,int,jsonb,jsonb) to authenticated;

-- Mises à jour en direct chez le client (la sécurité RLS s'applique aussi au temps réel).
do $$ begin
  alter publication supabase_realtime add table public.requests;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- Pour nommer Abou : exécuter une fois, avec l'email de son compte (créé via l'app) :
--   update public.profiles set role = 'concierge'
--    where id = (select id from auth.users where email = 'abou@exemple.com');
