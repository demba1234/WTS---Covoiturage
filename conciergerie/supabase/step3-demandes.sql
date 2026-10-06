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
