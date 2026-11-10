-- Repwise: quota IA par coach, idempotence Stripe et retrait du Premium offert aux coachs.
-- Fuseau de quota : Europe/Paris. A appliquer d'abord sur une base de test isolee.

begin;

-- Les coachs doivent désormais obtenir le Premium par leur propre abonnement.
-- Les clients conservent les accès offerts par leur coach.
update public.profils
   set acces_offert = false,
       acces_offert_le = null
 where role = 'coach'
   and coalesce(acces_offert, false) = true;

-- Une attribution historique ne doit plus ouvrir le Premium d'un compte coach.
create or replace function public.a_acces_premium()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select ((p.role = 'client' and coalesce(p.acces_offert, false))
      or coalesce(p.premium_jusqu_au > pg_catalog.now(), false))
      from public.profils p
     where p.id = (select auth.uid())
  ), false);
$$;

create table public.coach_ai_generation_requests (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  request_key uuid not null,
  local_day date not null,
  status text not null check (status in ('reserved', 'processing', 'succeeded', 'released')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz,
  error_code text,
  programme_id uuid references public.programmes(id) on delete set null,
  unique (coach_id, request_key)
);

create index coach_ai_generation_requests_daily_idx
  on public.coach_ai_generation_requests (coach_id, local_day, status, expires_at);

alter table public.coach_ai_generation_requests enable row level security;
revoke all on public.coach_ai_generation_requests from public, anon, authenticated;

create or replace function public.reserve_coach_ai_generation(
  p_coach_id uuid,
  p_requester_id uuid,
  p_client_id uuid,
  p_request_key uuid
)
returns table (
  accepted boolean,
  reservation_id uuid,
  used_today integer,
  reserved_today integer,
  quota_day date,
  reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (pg_catalog.timezone('Europe/Paris', pg_catalog.statement_timestamp()))::date;
  v_now timestamptz := pg_catalog.statement_timestamp();
  v_existing public.coach_ai_generation_requests%rowtype;
  v_used integer := 0;
  v_reserved integer := 0;
  v_id uuid;
begin
  if p_coach_id is null or p_requester_id is null or p_client_id is null or p_request_key is null then
    raise exception using errcode = '22023', message = 'invalid_generation_request';
  end if;

  if not exists (select 1 from public.profils p where p.id = p_coach_id and p.role = 'coach') then
    raise exception using errcode = '42501', message = 'coach_required';
  end if;

  if p_client_id = p_coach_id then
    if p_requester_id <> p_coach_id then
      raise exception using errcode = '42501', message = 'requester_not_allowed';
    end if;
  elsif not exists (
    select 1 from public.profils p
     where p.id = p_client_id and p.role = 'client' and p.coach_id = p_coach_id
  ) or p_requester_id not in (p_coach_id, p_client_id) then
    raise exception using errcode = '42501', message = 'client_not_assigned';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_coach_id::text || ':' || v_day::text, 0)
  );

  select r.* into v_existing
    from public.coach_ai_generation_requests r
   where r.coach_id = p_coach_id and r.request_key = p_request_key;

  if found then
    select count(*) filter (where r.status = 'succeeded')::integer,
           count(*) filter (where r.status in ('reserved', 'processing') and r.expires_at > v_now)::integer
      into v_used, v_reserved
      from public.coach_ai_generation_requests r
     where r.coach_id = p_coach_id and r.local_day = v_day;
    return query select (v_existing.status = 'reserved' and v_existing.expires_at > v_now),
                        v_existing.id, coalesce(v_used, 0), coalesce(v_reserved, 0), v_day,
                        case when v_existing.status = 'reserved' and v_existing.expires_at > v_now
                             then null else 'request_already_used_or_expired' end;
    return;
  end if;

  update public.coach_ai_generation_requests r
     set status = 'released', completed_at = v_now, error_code = 'reservation_expired'
   where r.coach_id = p_coach_id and r.local_day = v_day
     and r.status in ('reserved', 'processing') and r.expires_at <= v_now;

  select count(*) filter (where r.status = 'succeeded')::integer,
         count(*) filter (where r.status in ('reserved', 'processing') and r.expires_at > v_now)::integer
    into v_used, v_reserved
    from public.coach_ai_generation_requests r
   where r.coach_id = p_coach_id and r.local_day = v_day;

  v_used := coalesce(v_used, 0);
  v_reserved := coalesce(v_reserved, 0);
  if v_used + v_reserved >= 10 then
    return query select false, null::uuid, v_used, v_reserved, v_day, 'daily_limit_reached';
    return;
  end if;

  insert into public.coach_ai_generation_requests
    (coach_id, requester_id, client_id, request_key, local_day, status, expires_at)
  values
    (p_coach_id, p_requester_id, p_client_id, p_request_key, v_day, 'reserved', v_now + interval '20 minutes')
  returning id into v_id;

  return query select true, v_id, v_used, v_reserved + 1, v_day, null::text;
end;
$$;

create or replace function public.claim_coach_ai_generation(
  p_reservation_id uuid,
  p_requester_id uuid,
  p_coach_id uuid,
  p_client_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.coach_ai_generation_requests r
     set status = 'processing'
   where r.id = p_reservation_id
     and r.requester_id = p_requester_id
     and r.coach_id = p_coach_id
     and r.client_id = p_client_id
     and r.status = 'reserved'
     and r.expires_at > pg_catalog.statement_timestamp();
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function public.release_coach_ai_generation(
  p_reservation_id uuid,
  p_requester_id uuid,
  p_error_code text default 'generation_failed'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.coach_ai_generation_requests r
     set status = 'released', completed_at = pg_catalog.statement_timestamp(),
         error_code = left(coalesce(p_error_code, 'generation_failed'), 80)
   where r.id = p_reservation_id
     and r.requester_id = p_requester_id
     and r.status in ('reserved', 'processing');
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function public.commit_coach_ai_generation(
  p_reservation_id uuid,
  p_requester_id uuid,
  p_coach_id uuid,
  p_client_id uuid,
  p_programme jsonb,
  p_exercises jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.coach_ai_generation_requests%rowtype;
  v_programme_id uuid;
begin
  select r.* into v_request
    from public.coach_ai_generation_requests r
   where r.id = p_reservation_id
     and r.requester_id = p_requester_id
     and r.coach_id = p_coach_id
     and r.client_id = p_client_id
   for update;

  if not found then
    raise exception using errcode = '42501', message = 'generation_reservation_not_found';
  end if;
  if v_request.status = 'succeeded' and v_request.programme_id is not null then
    return v_request.programme_id;
  end if;
  if v_request.status <> 'processing' then
    raise exception using errcode = '55000', message = 'generation_reservation_not_processing';
  end if;
  if p_programme->>'coach_id' is distinct from p_coach_id::text or p_programme->>'client_id' is distinct from p_client_id::text then
    raise exception using errcode = '42501', message = 'generated_programme_owner_mismatch';
  end if;
  if pg_catalog.jsonb_typeof(p_exercises) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'invalid_generated_exercises';
  end if;
  if pg_catalog.jsonb_array_length(p_exercises) < 1 or pg_catalog.jsonb_array_length(p_exercises) > 48 then
    raise exception using errcode = '22023', message = 'invalid_generated_exercises';
  end if;

  insert into public.programmes
    (coach_id, client_id, titre, statut, cree_par, version, programme_precedent_id,
     questionnaire_id, resume_ia, justification_ia, message_client)
  values
    (p_coach_id, p_client_id, left(coalesce(p_programme->>'titre', 'Programme IA'), 120),
     'en_attente', 'ia', greatest(1, coalesce((p_programme->>'version')::integer, 1)),
     nullif(p_programme->>'programme_precedent_id', '')::uuid,
     nullif(p_programme->>'questionnaire_id', '')::uuid,
     left(nullif(p_programme->>'resume_ia', ''), 1000),
     left(nullif(p_programme->>'justification_ia', ''), 2000),
     left(nullif(p_programme->>'message_client', ''), 1000))
  returning id into v_programme_id;

  insert into public.exercices_programme
    (programme_id, nom_exercice, libelle_jour, position, series, repetitions, charge_kg, repos_secondes)
  select v_programme_id, x.nom_exercice, x.libelle_jour, x.position, x.series,
         x.repetitions, x.charge_kg, x.repos_secondes
    from pg_catalog.jsonb_to_recordset(p_exercises) as x(
      nom_exercice text, libelle_jour text, position integer, series integer,
      repetitions text, charge_kg numeric, repos_secondes integer
    );

  update public.coach_ai_generation_requests r
     set status = 'succeeded', programme_id = v_programme_id,
         completed_at = pg_catalog.statement_timestamp(), error_code = null
   where r.id = p_reservation_id;

  return v_programme_id;
end;
$$;

revoke all on function public.reserve_coach_ai_generation(uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.claim_coach_ai_generation(uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.release_coach_ai_generation(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.commit_coach_ai_generation(uuid, uuid, uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.reserve_coach_ai_generation(uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.claim_coach_ai_generation(uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.release_coach_ai_generation(uuid, uuid, text) to service_role;
grant execute on function public.commit_coach_ai_generation(uuid, uuid, uuid, uuid, jsonb, jsonb) to service_role;

-- Idempotence Stripe : la clé primaire event_id fournit l'unicité, ces RPCs
-- sérialisent les doublons et permettent de retraiter les échecs / traitements bloqués.
create or replace function public.claim_stripe_webhook(p_event_id text, p_event_type text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_now timestamptz := pg_catalog.statement_timestamp();
begin
  insert into public.stripe_webhook_events (event_id, event_type, status, received_at)
  values (p_event_id, p_event_type, 'processing', v_now)
  on conflict (event_id) do nothing;
  get diagnostics v_count = row_count;
  if v_count = 1 then return true; end if;

  update public.stripe_webhook_events e
     set status = 'processing', received_at = v_now, processed_at = null, error_code = null
   where e.event_id = p_event_id
     and (e.status = 'failed' or (e.status = 'processing' and e.received_at < v_now - interval '10 minutes'));
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function public.finish_stripe_webhook(
  p_event_id text,
  p_status text,
  p_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_status not in ('processed', 'failed') then
    raise exception using errcode = '22023', message = 'invalid_webhook_status';
  end if;
  update public.stripe_webhook_events e
     set status = p_status,
         processed_at = case when p_status = 'processed' then pg_catalog.statement_timestamp() else null end,
         error_code = case when p_status = 'failed' then left(coalesce(p_error_code, 'webhook_failed'), 80) else null end
   where e.event_id = p_event_id and e.status = 'processing';
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

revoke all on function public.claim_stripe_webhook(text, text) from public, anon, authenticated;
revoke all on function public.finish_stripe_webhook(text, text, text) from public, anon, authenticated;
grant execute on function public.claim_stripe_webhook(text, text) to service_role;
grant execute on function public.finish_stripe_webhook(text, text, text) to service_role;

commit;
