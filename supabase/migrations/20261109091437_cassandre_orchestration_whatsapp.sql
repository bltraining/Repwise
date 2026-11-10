-- Cassandre: orchestration durable et passerelle WhatsApp.
-- À appliquer uniquement à une base de test après revue. Ce fichier n'a pas été exécuté.

alter table cassandre_private.tasks
  add column if not exists request_id uuid,
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists parent_task_id uuid references cassandre_private.tasks(id) on delete set null,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists max_attempts integer not null default 3,
  add column if not exists locked_by uuid,
  add column if not exists locked_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists last_error_code text;

alter table cassandre_private.tasks drop constraint if exists tasks_status_check;
alter table cassandre_private.tasks add constraint tasks_status_check check (
  status = any (array[
    'queued','in_progress','blocked','needs_review','completed','cancelled',
    'pending','assigned','running','failed','needs_correction','awaiting_approval'
  ]::text[])
);
create index if not exists cassandre_tasks_claim_idx
  on cassandre_private.tasks (status, priority, created_at)
  where status in ('pending','assigned','queued','needs_correction');
create index if not exists cassandre_tasks_request_idx
  on cassandre_private.tasks (request_id, created_at);

create table if not exists cassandre_private.requests (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null default 'dashboard' check (channel in ('dashboard','whatsapp','system')),
  source_message_id text unique,
  message text not null,
  status text not null default 'pending' check (status in ('pending','running','completed','failed','blocked')),
  summary text,
  synthesis_locked_by uuid,
  synthesis_locked_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists cassandre_requests_owner_idx
  on cassandre_private.requests (owner_user_id, created_at desc);

do $$ begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'tasks_request_id_fkey'
       and conrelid = 'cassandre_private.tasks'::regclass
  ) then
    alter table cassandre_private.tasks
      add constraint tasks_request_id_fkey foreign key (request_id)
      references cassandre_private.requests(id) on delete cascade;
  end if;
end $$;

create table if not exists cassandre_private.whatsapp_connections (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  phone_number text not null,
  verified_at timestamptz,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (owner_user_id),
  unique (phone_number)
);

create table if not exists cassandre_private.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  phone_number text not null,
  last_message_at timestamptz,
  last_inbound_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_user_id, phone_number)
);
alter table cassandre_private.whatsapp_conversations
  add column if not exists last_inbound_at timestamptz;

create table if not exists cassandre_private.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  external_message_id text not null unique,
  conversation_id uuid not null references cassandre_private.whatsapp_conversations(id) on delete cascade,
  request_id uuid references cassandre_private.requests(id) on delete set null,
  direction text not null check (direction in ('inbound','outbound')),
  message_type text not null default 'text',
  content text not null default '',
  status text not null default 'received',
  created_at timestamptz not null default now()
);
create index if not exists cassandre_whatsapp_messages_conversation_idx
  on cassandre_private.whatsapp_messages (conversation_id, created_at desc);

create table if not exists cassandre_private.whatsapp_connection_challenges (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  phone_number text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempt_count integer not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists cassandre_whatsapp_challenges_owner_idx
  on cassandre_private.whatsapp_connection_challenges (owner_user_id, created_at desc)
  where consumed_at is null;

create table if not exists cassandre_private.whatsapp_pending_approvals (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references cassandre_private.tasks(id) on delete cascade,
  action_description text not null,
  risk_level text not null check (risk_level in ('low','medium','high','critical')),
  status text not null default 'awaiting_approval' check (status in ('awaiting_approval','approved','rejected','expired')),
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null,
  decided_at timestamptz,
  decision text,
  unique (task_id)
);
create index if not exists cassandre_whatsapp_approvals_pending_idx
  on cassandre_private.whatsapp_pending_approvals (expires_at)
  where status = 'awaiting_approval';

create table if not exists cassandre_private.settings (
  setting_key text primary key,
  setting_value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into cassandre_private.settings(setting_key, setting_value)
values ('daily_report', '{"enabled":false,"hour":"18:00","timezone":"Europe/Paris"}'::jsonb)
on conflict (setting_key) do nothing;

create table if not exists cassandre_private.ai_usage (
  usage_day date not null,
  calls integer not null default 0,
  estimated_input_tokens bigint not null default 0,
  estimated_output_tokens bigint not null default 0,
  reserved_tokens bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (usage_day),
  check (calls >= 0 and estimated_input_tokens >= 0 and estimated_output_tokens >= 0 and reserved_tokens >= 0)
);

alter table cassandre_private.requests enable row level security;
alter table cassandre_private.whatsapp_connections enable row level security;
alter table cassandre_private.whatsapp_conversations enable row level security;
alter table cassandre_private.whatsapp_messages enable row level security;
alter table cassandre_private.whatsapp_connection_challenges enable row level security;
alter table cassandre_private.whatsapp_pending_approvals enable row level security;
alter table cassandre_private.settings enable row level security;
alter table cassandre_private.ai_usage enable row level security;

-- Les objets de Cassandre restent inaccessibles aux rôles du navigateur.
revoke all on all tables in schema cassandre_private from public, anon, authenticated;
grant usage on schema cassandre_private to service_role;
grant select, insert, update, delete on all tables in schema cassandre_private to service_role;
grant select, insert, update, delete on cassandre_private.requests to service_role;
grant select, insert, update, delete on cassandre_private.ai_usage to service_role;

create or replace function public.cassandre_reserve_ai_call(p_daily_limit integer, p_token_limit integer, p_reserved_tokens integer)
returns date
language plpgsql
security definer
set search_path = pg_catalog, cassandre_private
as $$
declare v_day date := (now() at time zone 'Europe/Paris')::date;
begin
  if p_daily_limit is null or p_token_limit is null or p_reserved_tokens is null
     or p_daily_limit < 1 or p_token_limit < 1 or p_reserved_tokens < 1 or p_reserved_tokens > p_token_limit then
    return null;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('cassandre-ai:' || v_day::text, 0));
  insert into cassandre_private.ai_usage(usage_day, calls, reserved_tokens)
  values (v_day, 1, p_reserved_tokens)
  on conflict (usage_day) do update
    set calls = cassandre_private.ai_usage.calls + 1,
        reserved_tokens = cassandre_private.ai_usage.reserved_tokens + p_reserved_tokens,
        updated_at = now()
    where cassandre_private.ai_usage.calls < p_daily_limit
      and cassandre_private.ai_usage.estimated_input_tokens + cassandre_private.ai_usage.estimated_output_tokens
          + cassandre_private.ai_usage.reserved_tokens + p_reserved_tokens <= p_token_limit;
  if found then return v_day; end if;
  return null;
end;
$$;
revoke all on function public.cassandre_reserve_ai_call(integer,integer,integer) from public, anon, authenticated;
grant execute on function public.cassandre_reserve_ai_call(integer,integer,integer) to service_role;

create or replace function public.cassandre_record_ai_usage(p_usage_day date, p_reserved_tokens integer, p_input_tokens integer, p_output_tokens integer)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, cassandre_private
as $$
begin
  update cassandre_private.ai_usage
     set reserved_tokens = greatest(0, reserved_tokens - greatest(0,p_reserved_tokens)),
         estimated_input_tokens = estimated_input_tokens + greatest(0,p_input_tokens),
         estimated_output_tokens = estimated_output_tokens + greatest(0,p_output_tokens),
         updated_at = now()
   where usage_day = p_usage_day;
  return found;
end;
$$;
revoke all on function public.cassandre_record_ai_usage(date,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.cassandre_record_ai_usage(date,integer,integer,integer) to service_role;

create or replace function public.cassandre_claim_request_synthesis(p_request_id uuid, p_worker_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, cassandre_private
as $$
begin
  update cassandre_private.requests r
     set status = 'running', synthesis_locked_by = p_worker_id, synthesis_locked_at = now()
   where r.id = p_request_id and r.summary is null
     and (r.status in ('pending','running'))
     and (r.synthesis_locked_at is null or r.synthesis_locked_at < now() - interval '10 minutes')
     and not exists (
       select 1 from cassandre_private.tasks t
        where t.request_id = r.id and t.status not in ('completed','failed','blocked','cancelled','awaiting_approval')
     );
  return found;
end;
$$;
revoke all on function public.cassandre_claim_request_synthesis(uuid,uuid) from public, anon, authenticated;
grant execute on function public.cassandre_claim_request_synthesis(uuid,uuid) to service_role;

-- Réservation atomique: une tâche n'est revendiquée que par un seul worker.
create or replace function public.cassandre_claim_task(p_worker_id uuid, p_task_id uuid default null)
returns setof cassandre_private.tasks
language sql
security definer
set search_path = pg_catalog, cassandre_private
as $$
  with candidate as (
    select t.id
      from cassandre_private.tasks t
     where t.attempt_count < t.max_attempts
       and (p_task_id is null or t.id = p_task_id)
       and (t.status in ('pending','assigned','queued','needs_correction')
            or (t.status in ('running','in_progress') and t.locked_at < now() - interval '20 minutes'))
     order by case t.priority when 'critical' then 0 when 'high' then 1 when 'normal' then 2 else 3 end,
              t.created_at
     for update skip locked
     limit 1
  )
  update cassandre_private.tasks t
     set status = 'running', locked_by = p_worker_id, locked_at = now(),
         started_at = coalesce(t.started_at, now()), attempt_count = t.attempt_count + 1,
         updated_at = now()
    from candidate c
   where t.id = c.id
  returning t.*;
$$;

create or replace function public.cassandre_finish_task(
  p_task_id uuid, p_worker_id uuid, p_status text, p_result jsonb default null, p_error_code text default null
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog, cassandre_private
as $$
begin
  if p_status not in ('pending','completed','failed','blocked','needs_correction','awaiting_approval') then
    raise exception 'invalid_cassandre_task_status';
  end if;
  update cassandre_private.tasks
     set status = p_status, result = coalesce(p_result, result),
         last_error_code = left(p_error_code, 80), locked_by = null, locked_at = null,
         completed_at = case when p_status in ('completed','failed') then now() else null end,
         updated_at = now()
   where id = p_task_id and locked_by = p_worker_id and status = 'running';
  return found;
end;
$$;

revoke all on function public.cassandre_claim_task(uuid,uuid) from public, anon, authenticated;
revoke all on function public.cassandre_finish_task(uuid,uuid,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.cassandre_claim_task(uuid,uuid) to service_role;
grant execute on function public.cassandre_finish_task(uuid,uuid,text,jsonb,text) to service_role;

create or replace function public.cassandre_cancel_task(p_owner_user_id uuid, p_task_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, cassandre_private
as $$
begin
  update cassandre_private.tasks
     set status='cancelled', locked_by=null, locked_at=null, updated_at=now()
   where id=p_task_id and owner_user_id=p_owner_user_id and status in ('pending','assigned','queued');
  return found;
end;
$$;
revoke all on function public.cassandre_cancel_task(uuid,uuid) from public, anon, authenticated;
grant execute on function public.cassandre_cancel_task(uuid,uuid) to service_role;

-- Ajoute les droits service_role aux tables WhatsApp créées dans ce fichier.
grant select, insert, update, delete on cassandre_private.whatsapp_connections,
  cassandre_private.whatsapp_conversations, cassandre_private.whatsapp_messages,
  cassandre_private.whatsapp_pending_approvals, cassandre_private.whatsapp_connection_challenges,
  cassandre_private.settings to service_role;

-- Les tables restent dans le schéma privé non exposé à l'API. Le serveur appelle
-- cette façade publique réservée à service_role; aucune table privée n'est publiée.
create or replace function public.cassandre_private_api(
  p_table text, p_method text, p_params jsonb default '{}'::jsonb, p_body jsonb default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, cassandre_private
as $$
declare
  v_owner uuid;
  v_id uuid;
  v_request uuid;
  v_conversation uuid;
  v_status text;
  v_limit integer := least(greatest(coalesce((p_params->>'limit')::integer,100),1),5000);
  v_source text;
  v_external text;
  v_direction text;
  v_phone text;
  v_message text;
  v_result jsonb;
  v_row jsonb;
begin
  if p_method not in ('GET','POST','PATCH') then raise exception 'cassandre_method_not_allowed'; end if;
  -- PostgREST filter syntax uses eq.<value>; split_part with '.' is explicit and safe.
  if p_params ? 'owner_user_id' then v_owner := nullif(split_part(p_params->>'owner_user_id','.',2),'')::uuid; end if;
  if p_params ? 'id' then v_id := nullif(split_part(p_params->>'id','.',2),'')::uuid; end if;
  if p_params ? 'request_id' then v_request := nullif(split_part(p_params->>'request_id','.',2),'')::uuid; end if;
  v_status := case when p_params ? 'status' and split_part(p_params->>'status','.',1)='eq' then split_part(p_params->>'status','.',2) end;
  v_source := case when p_params ? 'source_message_id' then regexp_replace(p_params->>'source_message_id','^eq[.]','') end;
  v_external := case when p_params ? 'external_message_id' then regexp_replace(p_params->>'external_message_id','^eq[.]','') end;
  v_direction := case when p_params ? 'direction' then split_part(p_params->>'direction','.',2) end;
  v_phone := case when p_params ? 'phone_number' then split_part(p_params->>'phone_number','.',2) end;

  if p_method = 'GET' then
    if p_table = 'agents' then
      select coalesce(jsonb_agg(to_jsonb(a) order by a.agent_key),'[]'::jsonb) into v_result from (select * from cassandre_private.agents order by agent_key limit v_limit) a;
    elsif p_table = 'requests' then
      select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) into v_result from (select * from cassandre_private.requests r where (v_id is null or r.id=v_id) and (v_owner is null or r.owner_user_id=v_owner) and (v_source is null or r.source_message_id=v_source) and (v_status is null or r.status=v_status or (split_part(p_params->>'status','.',1)='in' and r.status=any(string_to_array(trim(both '()' from split_part(p_params->>'status','.',2)),',')))) and (v_request is null or r.id=v_request) order by r.created_at desc limit v_limit) r;
    elsif p_table = 'tasks' then
      select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]'::jsonb) into v_result from (select * from cassandre_private.tasks t where (v_id is null or t.id=v_id) and (v_owner is null or t.owner_user_id=v_owner) and (v_request is null or t.request_id=v_request) and (v_status is null or t.status=v_status or (split_part(p_params->>'status','.',1)='in' and t.status=any(string_to_array(trim(both '()' from split_part(p_params->>'status','.',2)),',')))) order by t.created_at desc limit v_limit) t;
    elsif p_table = 'daily_reports' then
      select coalesce(jsonb_agg(to_jsonb(r) order by r.report_date desc),'[]'::jsonb) into v_result from (select * from cassandre_private.daily_reports r where (not (p_params ? 'report_date') or r.report_date=(split_part(p_params->>'report_date','.',2))::date) order by r.report_date desc limit v_limit) r;
    elsif p_table = 'decisions' then
      select coalesce(jsonb_agg(to_jsonb(d) order by d.requested_at desc),'[]'::jsonb) into v_result from (select * from cassandre_private.decisions d order by d.requested_at desc limit v_limit) d;
    elsif p_table = 'whatsapp_pending_approvals' then
      select coalesce(jsonb_agg(to_jsonb(a) order by a.requested_at desc),'[]'::jsonb) into v_result from (select * from cassandre_private.whatsapp_pending_approvals a where (v_status is null or a.status=v_status) order by a.requested_at desc limit v_limit) a;
    elsif p_table = 'whatsapp_connections' then
      select coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb) into v_result from (select * from cassandre_private.whatsapp_connections c where (v_owner is null or c.owner_user_id=v_owner) and (v_phone is null or c.phone_number=v_phone) and (not (p_params ? 'enabled') or c.enabled=(split_part(p_params->>'enabled','.',2))::boolean) and (not (p_params ? 'verified_at') or c.verified_at is not null) limit v_limit) c;
    elsif p_table = 'whatsapp_conversations' then
      select coalesce(jsonb_agg(to_jsonb(c) order by c.last_message_at desc nulls last),'[]'::jsonb) into v_result from (select * from cassandre_private.whatsapp_conversations c where (v_id is null or c.id=v_id) and (v_owner is null or c.owner_user_id=v_owner) and (v_phone is null or c.phone_number=v_phone) order by c.last_message_at desc nulls last limit v_limit) c;
    elsif p_table = 'whatsapp_messages' then
      select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at desc),'[]'::jsonb) into v_result from (select * from cassandre_private.whatsapp_messages m where (v_id is null or m.id=v_id) and (v_external is null or m.external_message_id=v_external) and (v_direction is null or m.direction=v_direction) and (v_request is null or m.request_id=v_request) and (not (p_params ? 'conversation_id') or m.conversation_id=any(string_to_array(trim(both '()' from split_part(p_params->>'conversation_id','.',2)),',')::uuid[])) and (not (p_params ? 'status') or v_status is null or m.status=v_status) order by m.created_at desc limit v_limit) m;
    elsif p_table = 'whatsapp_connection_challenges' then
      select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc),'[]'::jsonb) into v_result from (select * from cassandre_private.whatsapp_connection_challenges c where c.owner_user_id=v_owner and (v_id is null or c.id=v_id) and (not (p_params ? 'consumed_at') or c.consumed_at is null) and (not (p_params ? 'expires_at') or c.expires_at > replace(p_params->>'expires_at','gt.','')::timestamptz) order by c.created_at desc limit v_limit) c;
    elsif p_table = 'settings' then
      select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) into v_result from (select * from cassandre_private.settings s where (not (p_params ? 'setting_key') or s.setting_key=split_part(p_params->>'setting_key','.',2)) limit v_limit) s;
    else raise exception 'cassandre_table_not_allowed';
    end if;
    return coalesce(v_result,'[]'::jsonb);
  end if;

  if p_method = 'POST' then
    if p_table = 'requests' then
      insert into cassandre_private.requests(id,owner_user_id,channel,source_message_id,message,status)
      values(coalesce((p_body->>'id')::uuid,gen_random_uuid()),(p_body->>'owner_user_id')::uuid,p_body->>'channel',p_body->>'source_message_id',p_body->>'message',coalesce(p_body->>'status','pending'))
      returning jsonb_build_array(jsonb_build_object('id',id)) into v_result;
    elsif p_table = 'tasks' then
      with inserted as (
        insert into cassandre_private.tasks(request_id,owner_user_id,agent_key,title,description,status,assigned_by,metadata)
        select (x->>'request_id')::uuid,(x->>'owner_user_id')::uuid,x->>'agent_key',x->>'title',coalesce(x->>'description',''),coalesce(x->>'status','pending'),coalesce(x->>'assigned_by','cassandre'),coalesce(x->'metadata','{}'::jsonb)
        from jsonb_array_elements(case when jsonb_typeof(p_body)='array' then p_body else jsonb_build_array(p_body) end) as elems(x)
        returning id
      ) select coalesce(jsonb_agg(jsonb_build_object('id',inserted.id)),'[]'::jsonb) into v_result from inserted;
    elsif p_table = 'audit_log' then
      insert into cassandre_private.audit_log(actor,action,target_type,target_id,details) values(p_body->>'actor',p_body->>'action',p_body->>'target_type',p_body->>'target_id',coalesce(p_body->'details','{}'::jsonb));
      v_result := '[]'::jsonb;
    elsif p_table = 'whatsapp_conversations' then
      insert into cassandre_private.whatsapp_conversations(owner_user_id,phone_number,last_message_at,last_inbound_at)
      values((p_body->>'owner_user_id')::uuid,p_body->>'phone_number',nullif(p_body->>'last_message_at','')::timestamptz,nullif(p_body->>'last_inbound_at','')::timestamptz)
      on conflict(owner_user_id,phone_number) do update
        set last_message_at=coalesce(excluded.last_message_at,cassandre_private.whatsapp_conversations.last_message_at),
            last_inbound_at=coalesce(excluded.last_inbound_at,cassandre_private.whatsapp_conversations.last_inbound_at)
      returning jsonb_build_array(jsonb_build_object('id',id,'last_inbound_at',last_inbound_at)) into v_result;
    elsif p_table = 'whatsapp_messages' then
      insert into cassandre_private.whatsapp_messages(external_message_id,conversation_id,request_id,direction,message_type,content,status)
      values(p_body->>'external_message_id',(p_body->>'conversation_id')::uuid,nullif(p_body->>'request_id','')::uuid,p_body->>'direction',coalesce(p_body->>'message_type','text'),coalesce(p_body->>'content',''),coalesce(p_body->>'status','received'))
      on conflict(external_message_id) do nothing
      returning jsonb_build_array(jsonb_build_object('id',id)) into v_result;
      v_result := coalesce(v_result,'[]'::jsonb);
    elsif p_table = 'whatsapp_connection_challenges' then
      insert into cassandre_private.whatsapp_connection_challenges(owner_user_id,phone_number,code_hash,expires_at)
      values((p_body->>'owner_user_id')::uuid,p_body->>'phone_number',p_body->>'code_hash',(p_body->>'expires_at')::timestamptz)
      returning jsonb_build_array(jsonb_build_object('id',id)) into v_result;
    elsif p_table = 'whatsapp_connections' then
      insert into cassandre_private.whatsapp_connections(owner_user_id,phone_number,verified_at,enabled)
      values((p_body->>'owner_user_id')::uuid,p_body->>'phone_number',(p_body->>'verified_at')::timestamptz,coalesce((p_body->>'enabled')::boolean,false))
      on conflict(owner_user_id) do update set phone_number=excluded.phone_number,verified_at=excluded.verified_at,enabled=excluded.enabled
      returning jsonb_build_array(jsonb_build_object('owner_user_id',owner_user_id)) into v_result;
    elsif p_table = 'settings' then
      insert into cassandre_private.settings(setting_key,setting_value,updated_at)
      values(p_body->>'setting_key',p_body->'setting_value',coalesce((p_body->>'updated_at')::timestamptz,now()))
      on conflict(setting_key) do update set setting_value=excluded.setting_value,updated_at=excluded.updated_at;
      v_result := '[]'::jsonb;
    else raise exception 'cassandre_table_not_allowed';
    end if;
    return coalesce(v_result,'[]'::jsonb);
  end if;

  if p_method = 'PATCH' then
    if p_table = 'requests' then
      update cassandre_private.requests r set
        status=coalesce(p_body->>'status',r.status),
        summary=case when p_body ? 'summary' then p_body->>'summary' else r.summary end,
        completed_at=case when p_body ? 'completed_at' then nullif(p_body->>'completed_at','')::timestamptz else r.completed_at end,
        synthesis_locked_by=case when p_body ? 'synthesis_locked_by' then nullif(p_body->>'synthesis_locked_by','')::uuid else r.synthesis_locked_by end,
        synthesis_locked_at=case when p_body ? 'synthesis_locked_at' then nullif(p_body->>'synthesis_locked_at','')::timestamptz else r.synthesis_locked_at end
      where r.id=v_id and (not (p_params ? 'owner_user_id') or r.owner_user_id=v_owner)
        and (not (p_params ? 'synthesis_locked_by') or r.synthesis_locked_by=nullif(split_part(p_params->>'synthesis_locked_by','.',2),'')::uuid);
    elsif p_table = 'whatsapp_messages' then
      update cassandre_private.whatsapp_messages m set status=coalesce(p_body->>'status',m.status),request_id=case when p_body ? 'request_id' then nullif(p_body->>'request_id','')::uuid else m.request_id end
      where (v_id is null or m.id=v_id) and (v_external is null or m.external_message_id=v_external) and (v_direction is null or m.direction=v_direction);
    elsif p_table = 'whatsapp_connection_challenges' then
      update cassandre_private.whatsapp_connection_challenges c set attempt_count=coalesce((p_body->>'attempt_count')::integer,c.attempt_count),consumed_at=case when p_body ? 'consumed_at' then nullif(p_body->>'consumed_at','')::timestamptz else c.consumed_at end
      where c.id=v_id and (v_owner is null or c.owner_user_id=v_owner);
    else raise exception 'cassandre_table_not_allowed';
    end if;
    return '[]'::jsonb;
  end if;
  raise exception 'cassandre_action_not_allowed';
end;
$$;
revoke all on function public.cassandre_private_api(text,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.cassandre_private_api(text,text,jsonb,jsonb) to service_role;
