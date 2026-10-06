-- WTS Conciergerie — étape 2 : comptes et profils
-- À exécuter une fois dans Supabase > SQL Editor.

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  first_name  text not null default '',
  last_name   text not null default '',
  tel         text not null default '',
  role        text not null default 'client' check (role in ('client','concierge')),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Un client lit et modifie uniquement son propre profil.
drop policy if exists "profil: lecture" on public.profiles;
create policy "profil: lecture" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profil: modification" on public.profiles;
create policy "profil: modification" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Le client ne peut modifier que ces colonnes (jamais « role »).
revoke update on public.profiles from authenticated;
grant  update (first_name, last_name, tel) on public.profiles to authenticated;

-- Création automatique du profil à l'inscription.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, last_name, tel)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'first_name',''),
          coalesce(new.raw_user_meta_data->>'last_name',''),
          coalesce(new.raw_user_meta_data->>'tel',''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
