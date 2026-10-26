-- WTS Conciergerie : installation complète en un seul collage.
-- Supabase > SQL Editor > New query > coller tout ce fichier > Run. À faire une seule fois.


-- ================================================================
-- schema.sql
-- ================================================================
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

-- ================================================================
-- step3-demandes.sql
-- ================================================================
-- WTS Conciergerie — étape 3 : demandes, panier, pièces jointes
-- À exécuter dans Supabase > SQL Editor, après schema.sql.

-- ---------- Demandes ----------
create table if not exists public.requests (
  id          uuid primary key default gen_random_uuid(),
  num         bigint generated always as identity,          -- Nº affiché (0001, 0002…)
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  service     text not null check (service in ('billetterie','hotel','visas','transfert','livraisons','lavage','assurance','location','circuits')),
  kind        text not null,
  title       text not null,
  sub         text not null default '',
  step        int  not null default 0 check (step between 0 and 3),   -- 0 Reçue · 1 En cours · 2 À valider · 3 Confirmé
  notes       jsonb not null default '["","","",""]',       -- texte d'Abou pour chaque étape
  step_times  jsonb not null default '[null,null,null,null]', -- date de chaque étape
  proposal    jsonb,                                         -- {t, d, p} posé par Abou
  recap       jsonb not null default '[]',                   -- [[libellé, valeur], …] saisi par le client
  attachments jsonb not null default '[]',                   -- [{label, name, path}]
  created_at  timestamptz not null default now()
);
create index if not exists requests_user_idx on public.requests (user_id, num desc);

create or replace function public.requests_init() returns trigger language plpgsql as $$
begin
  new.step_times := jsonb_build_array(now(), null, null, null);
  return new;
end $$;
drop trigger if exists requests_init on public.requests;
create trigger requests_init before insert on public.requests
  for each row execute function public.requests_init();

alter table public.requests enable row level security;
drop policy if exists "demande: lecture" on public.requests;
create policy "demande: lecture" on public.requests for select to authenticated using (user_id = auth.uid());
drop policy if exists "demande: création" on public.requests;
create policy "demande: création" on public.requests for insert to authenticated with check (user_id = auth.uid());

-- Le client crée une demande mais ne peut jamais en changer le statut, les notes ni la proposition.
revoke all on public.requests from authenticated;
grant select on public.requests to authenticated;
grant insert (service, kind, title, sub, recap, attachments) on public.requests to authenticated;

-- Le client valide une proposition (étape « À valider » → « Confirmé »), rien d'autre.
create or replace function public.validate_request(p_id uuid) returns public.requests
language plpgsql security definer set search_path = public as $$
declare r public.requests;
begin
  update public.requests
     set step = 3,
         notes = jsonb_set(notes, '{2}', '"Validée par vous"'),
         step_times = jsonb_set(step_times, '{3}', to_jsonb(now()))
   where id = p_id and user_id = auth.uid() and step = 2
   returning * into r;
  if r.id is null then raise exception 'Aucune proposition à valider'; end if;
  return r;
end $$;
revoke all on function public.validate_request(uuid) from public, anon;
grant execute on function public.validate_request(uuid) to authenticated;

-- ---------- Panier ----------
create table if not exists public.cart_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  service    text not null check (service in ('billetterie','hotel','transfert')),
  data       jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.cart_items enable row level security;
drop policy if exists "panier: tout" on public.cart_items;
create policy "panier: tout" on public.cart_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.cart_items from authenticated;
grant select, delete on public.cart_items to authenticated;
grant insert (service, data) on public.cart_items to authenticated;

-- Envoi du panier : crée toutes les demandes et vide le panier en une seule opération.
create or replace function public.send_cart(items jsonb) returns setof public.requests
language plpgsql as $$
begin
  return query
    insert into public.requests (service, kind, title, sub, recap, attachments)
    select i.service, i.kind, i.title, i.sub, coalesce(i.recap,'[]'), coalesce(i.attachments,'[]')
      from jsonb_to_recordset(items) as i(service text, kind text, title text, sub text, recap jsonb, attachments jsonb)
    returning *;
  delete from public.cart_items where user_id = auth.uid();
end $$;
revoke all on function public.send_cart(jsonb) from public, anon;
grant execute on function public.send_cart(jsonb) to authenticated;

-- ---------- Pièces jointes (copie du passeport) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, array['application/pdf','image/jpeg','image/png','image/heic','image/webp'])
on conflict (id) do nothing;

drop policy if exists "documents: dépôt" on storage.objects;
create policy "documents: dépôt" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "documents: lecture" on storage.objects;
create policy "documents: lecture" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- ================================================================
-- step4-suivi.sql
-- ================================================================
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

-- ================================================================
-- step5-messages.sql
-- ================================================================
-- WTS Conciergerie — étape 5 : messages entre le client et Abou
-- À exécuter dans Supabase > SQL Editor, après step4-suivi.sql.

-- Une conversation par client (client_id). Abou écrit à n'importe quel client, un client n'écrit que dans la sienne.
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  num        bigint generated always as identity,
  client_id  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  sender     text not null check (sender in ('client','concierge')),
  body       text not null default '' check (char_length(body) <= 2000),
  options    jsonb check (options is null or jsonb_typeof(options) = 'array'),   -- [{t, d}] : choix proposés par Abou
  held       int,                                                                -- option retenue par le client
  read_at    timestamptz,                                                        -- lu par l'autre personne
  created_at timestamptz not null default now(),
  check (body <> '' or options is not null)
);
create index if not exists messages_client_idx on public.messages (client_id, num);

alter table public.messages enable row level security;

drop policy if exists "message: lecture client" on public.messages;
create policy "message: lecture client" on public.messages for select to authenticated using (client_id = auth.uid());
drop policy if exists "message: lecture concierge" on public.messages;
create policy "message: lecture concierge" on public.messages for select to authenticated using (public.is_concierge());

drop policy if exists "message: écriture client" on public.messages;
create policy "message: écriture client" on public.messages for insert to authenticated
  with check (sender = 'client' and client_id = auth.uid() and options is null);
drop policy if exists "message: écriture concierge" on public.messages;
create policy "message: écriture concierge" on public.messages for insert to authenticated
  with check (public.is_concierge() and sender = 'concierge');

-- Personne ne modifie ni ne supprime un message : seuls l'envoi et les deux fonctions ci-dessous existent.
revoke all on public.messages from authenticated;
grant select on public.messages to authenticated;
grant insert (client_id, sender, body, options) on public.messages to authenticated;

-- « Lu » : le concierge marque les messages d'un client, le client marque ceux d'Abou.
create or replace function public.mark_read(p_client uuid default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.is_concierge() and p_client is not null then
    update public.messages set read_at = now() where client_id = p_client and sender = 'client' and read_at is null;
  else
    update public.messages set read_at = now() where client_id = auth.uid() and sender = 'concierge' and read_at is null;
  end if;
end $$;
revoke all on function public.mark_read(uuid) from public, anon;
grant execute on function public.mark_read(uuid) to authenticated;

-- Le client retient l'une des options proposées par Abou ; sa réponse apparaît dans la conversation.
create or replace function public.hold_option(p_msg uuid, p_idx int) returns public.messages
language plpgsql security definer set search_path = public as $$
declare m public.messages;
begin
  select * into m from public.messages
   where id = p_msg and client_id = auth.uid() and sender = 'concierge' and options is not null;
  if m.id is null then raise exception 'Message introuvable'; end if;
  if p_idx < 0 or p_idx >= jsonb_array_length(m.options) then raise exception 'Option invalide'; end if;
  if m.held is distinct from p_idx then
    update public.messages set held = p_idx where id = m.id returning * into m;
    insert into public.messages (client_id, sender, body)
    values (auth.uid(), 'client', 'J’ai retenu : ' || (m.options -> p_idx ->> 't'));
  end if;
  return m;
end $$;
revoke all on function public.hold_option(uuid,int) from public, anon;
grant execute on function public.hold_option(uuid,int) to authenticated;

-- Temps réel.
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- ================================================================
-- step7-notifications.sql
-- ================================================================
-- WTS Conciergerie — étape 7 : notifications push
-- À exécuter dans Supabase > SQL Editor, après step5-messages.sql. Voir le README pour les 4 étapes de mise en route.

-- Appareils inscrits aux notifications (un utilisateur peut en avoir plusieurs).
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push: lecture" on public.push_subscriptions;
create policy "push: lecture" on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
drop policy if exists "push: suppression" on public.push_subscriptions;
create policy "push: suppression" on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());
revoke all on public.push_subscriptions from authenticated;
grant select, delete on public.push_subscriptions to authenticated;

-- Inscription d'un appareil : si l'appareil servait à un autre compte, il passe au compte courant.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth;
end $$;
revoke all on function public.save_push_subscription(text,text,text) from public, anon;
grant execute on function public.save_push_subscription(text,text,text) to authenticated;

-- Adresse de la fonction « notify » et son secret : inaccessibles à l'app (aucun droit, aucune règle).
create table if not exists public.push_config (
  id     int primary key default 1 check (id = 1),
  url    text not null,
  secret text not null
);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;

create extension if not exists pg_net;

-- Déclenche la fonction « notify ». Ne bloque jamais l'écriture d'un message ou d'une demande, même en cas de panne.
create or replace function public.push_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare cfg public.push_config;
begin
  select * into cfg from public.push_config where id = 1;
  if cfg.url is null then return null; end if;
  begin
    perform net.http_post(
      url     := cfg.url,
      body    := jsonb_build_object('table', TG_TABLE_NAME, 'type', TG_OP, 'record', to_jsonb(new),
                                    'old_record', case when TG_OP = 'UPDATE' then to_jsonb(old) end),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', cfg.secret));
  exception when others then null;
  end;
  return null;
end $$;

drop trigger if exists push_on_message on public.messages;
create trigger push_on_message after insert on public.messages for each row execute function public.push_notify();
drop trigger if exists push_on_request_insert on public.requests;
create trigger push_on_request_insert after insert on public.requests for each row execute function public.push_notify();
drop trigger if exists push_on_request_step on public.requests;
create trigger push_on_request_step after update on public.requests for each row
  when (old.step is distinct from new.step) execute function public.push_notify();
