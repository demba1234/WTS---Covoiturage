-- WTS Conciergerie — étape 5 : messages entre le client et Antoine
-- À exécuter dans Supabase > SQL Editor, après step4-suivi.sql.

-- Une conversation par client (client_id). Antoine écrit à n'importe quel client, un client n'écrit que dans la sienne.
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  num        bigint generated always as identity,
  client_id  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  sender     text not null check (sender in ('client','concierge')),
  body       text not null default '' check (char_length(body) <= 2000),
  options    jsonb check (options is null or jsonb_typeof(options) = 'array'),   -- [{t, d}] : choix proposés par Antoine
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

-- « Lu » : le concierge marque les messages d'un client, le client marque ceux d'Antoine.
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

-- Le client retient l'une des options proposées par Antoine ; sa réponse apparaît dans la conversation.
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
