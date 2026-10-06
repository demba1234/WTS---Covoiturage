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
