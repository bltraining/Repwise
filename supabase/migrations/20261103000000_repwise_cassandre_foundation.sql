-- Fondation schema-only de test, alignée sur les colonnes et relations observées.
-- Aucun utilisateur ni aucune donnée métier n'est créé ici.
-- À appliquer uniquement au projet Supabase de test avant 20261104202211 et 20261109091437.
begin;

create schema if not exists cassandre_private;
revoke all on schema cassandre_private from public, anon, authenticated;
grant usage on schema cassandre_private to service_role;

-- Profils : subset exact nécessaire aux deux migrations, à l'auth serveur,
-- aux collecteurs Cassandre et aux références coach/client observées.
create table public.profils (
  id uuid primary key references auth.users(id),
  nom_complet text not null default '',
  role text not null default 'client' check (role = any (array['coach','client']::text[])),
  coach_id uuid references public.profils(id) on delete set null,
  cree_le timestamptz not null default now(),
  langue text not null default 'fr' check (langue = any (array['fr','en']::text[])),
  acces_offert boolean not null default false,
  acces_offert_le timestamptz,
  duree_repos_s integer not null default 90 check (duree_repos_s between 15 and 600),
  rappel_seance boolean not null default false,
  premium_jusqu_au timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  resilie boolean not null default false
);
create index profils_coach_id_idx on public.profils(coach_id);

-- Programmes : id requis par la FK de quota; coach/client/statut sont les
-- colonnes réellement interrogées par les collecteurs et les RPC.
create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profils(id),
  client_id uuid not null references public.profils(id),
  titre text not null,
  statut text not null default 'brouillon'
    check (statut = any (array['brouillon','en_attente','approuve','publie','refuse','archive']::text[])),
  cree_par text not null default 'coach' check (cree_par = any (array['coach','ia']::text[])),
  notes_coach text,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  version integer not null default 1,
  programme_precedent_id uuid references public.programmes(id),
  resume_ia text,
  justification_ia text,
  publie_le timestamptz,
  message_client text,
  motif_refus text check (motif_refus is null or char_length(motif_refus) between 3 and 500),
  questionnaire_id uuid
);
create index programmes_coach_id_idx on public.programmes(coach_id);
create index programmes_client_id_idx on public.programmes(client_id);
create index programmes_precedent_id_idx on public.programmes(programme_precedent_id);
create index programmes_questionnaire_idx on public.programmes(questionnaire_id);
create unique index un_programme_publie_par_client on public.programmes(client_id) where statut = 'publie';
create unique index une_proposition_en_attente_par_client on public.programmes(client_id) where statut = 'en_attente';

create table public.questionnaires_programme (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null default auth.uid() references public.profils(id),
  seances_par_semaine integer not null check (seances_par_semaine between 1 and 14),
  objectif text not null check (objectif = any (array['Force','Prise de muscle','Perte de poids','Endurance']::text[])),
  muscles text[] not null default '{}',
  remarque text check (remarque is null or char_length(remarque) <= 120),
  cree_le timestamptz not null default now(),
  constraint questionnaires_programme_muscles_check check (cardinality(muscles) <= 10)
);
alter table public.programmes add constraint programmes_questionnaire_id_fkey
  foreign key (questionnaire_id) references public.questionnaires_programme(id);

create table public.exercices_programme (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id),
  nom_exercice text not null,
  libelle_jour text not null default '',
  position integer not null default 1,
  series integer not null default 3 check (series > 0),
  repetitions text not null default '8-12',
  repos_secondes integer check (repos_secondes >= 0),
  notes text,
  cree_le timestamptz not null default now(),
  charge_kg numeric not null default 0 check (charge_kg >= 0)
);
create index exercices_programme_programme_position_idx on public.exercices_programme(programme_id,position);

create table public.exercices (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  groupe_musculaire text not null,
  materiel text,
  muscles_principaux text[] not null default '{}',
  muscles_secondaires text[] not null default '{}'
);

-- Source d'idempotence Stripe requise par la migration 20261104.
create table public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null check (status = any (array['processing','processed','failed']::text[])),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_code text
);

-- Les collecteurs d'agents lisent uniquement ces colonnes et agrégats.
create table public.seances (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profils(id),
  effectue_le timestamptz not null default now(),
  type text not null default 'Séance',
  ressenti text,
  note text,
  cree_le timestamptz not null default now()
);
create index seances_client_date_idx on public.seances(client_id,effectue_le desc);

create table public.journal_seances (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profils(id),
  programme_id uuid references public.programmes(id),
  nom_exercice text not null,
  effectue_le timestamptz not null default now(),
  series_realisees integer check (series_realisees >= 0),
  repetitions_realisees text,
  charge_kg numeric check (charge_kg >= 0),
  rir integer check (rir between 0 and 10),
  notes text,
  cree_le timestamptz not null default now(),
  seance_id uuid references public.seances(id),
  charges_kg numeric[],
  reps integer[]
);
create index journal_seances_client_date_idx on public.journal_seances(client_id,effectue_le desc);

create table public.bilans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profils(id),
  date_bilan date not null default current_date,
  poids_kg numeric check (poids_kg > 0),
  recuperation text,
  notes_performance text,
  difficultes text,
  douleurs text,
  notes_coach text,
  cree_le timestamptz not null default now()
);
create index bilans_client_date_idx on public.bilans(client_id,date_bilan desc);

create table public.objectifs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profils(id),
  type text not null check (type = any (array['perte_poids','prise_masse','force','endurance','maintien']::text[])),
  poids_cible_kg numeric check (poids_cible_kg is null or poids_cible_kg between 20 and 400),
  date_cible date,
  notes text,
  actif boolean not null default true,
  cree_le timestamptz not null default now()
);
create index objectifs_client_idx on public.objectifs(client_id,actif);

create table public.alertes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profils(id),
  cle text not null,
  type text not null,
  message text not null,
  lu boolean not null default false,
  cree_le timestamptz not null default now()
);
create index alertes_coach_date_idx on public.alertes(coach_id,cree_le desc);

create table public.journal_hydratation (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profils(id),
  date_jour date not null default current_date,
  verres integer not null default 0 check (verres between 0 and 40),
  objectif_ml integer not null default 2500 check (objectif_ml between 500 and 8000),
  modifie_le timestamptz not null default now(),
  unique(client_id,date_jour)
);

create table public.aliments (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  kcal_100g numeric not null check (kcal_100g >= 0),
  proteines_100g numeric not null default 0 check (proteines_100g >= 0),
  glucides_100g numeric not null default 0 check (glucides_100g >= 0),
  lipides_100g numeric not null default 0 check (lipides_100g >= 0),
  fibres_100g numeric not null default 0 check (fibres_100g >= 0),
  cree_le timestamptz not null default now(),
  source text not null default 'manuel',
  code_externe text
);
create unique index aliments_nom_key on public.aliments(nom);
create unique index aliments_source_code_idx on public.aliments(source,code_externe) where code_externe is not null;

create table public.journal_repas (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profils(id),
  date_repas date not null default current_date,
  moment text check (moment is null or moment = any (array['petit_dejeuner','dejeuner','diner','collation']::text[])),
  aliment_id uuid references public.aliments(id),
  nom text not null,
  grammes numeric not null check (grammes > 0 and grammes <= 5000),
  kcal numeric not null default 0 check (kcal >= 0),
  proteines_g numeric not null default 0 check (proteines_g >= 0),
  glucides_g numeric not null default 0 check (glucides_g >= 0),
  lipides_g numeric not null default 0 check (lipides_g >= 0),
  fibres_g numeric not null default 0 check (fibres_g >= 0),
  cree_le timestamptz not null default now()
);
create index journal_repas_client_date_idx on public.journal_repas(client_id,date_repas desc);

-- Même RPC et mêmes colonnes que la fonction observée dans le projet existant.
-- L'appel est réservé au service_role; aucune donnée de production n'est copiée.
create or replace function public.cassandre_save_report(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, cassandre_private
as $$
declare
  report_id uuid;
  report_day date := coalesce((payload->>'report_date')::date,current_date);
begin
  insert into cassandre_private.daily_reports
    (report_date,results,problems,opportunities,decisions,priorities,executive_summary,status)
  values
    (report_day,coalesce(payload->'results','{}'::jsonb),coalesce(payload->'problems','[]'::jsonb),
     coalesce(payload->'opportunities','[]'::jsonb),coalesce(payload->'decisions','[]'::jsonb),
     coalesce(payload->'priorities','[]'::jsonb),coalesce(payload->>'executive_summary',''),'ready')
  on conflict(report_date) do update set
    results=excluded.results, problems=excluded.problems, opportunities=excluded.opportunities,
    decisions=excluded.decisions, priorities=excluded.priorities,
    executive_summary=excluded.executive_summary, generated_at=now(), status='ready'
  returning id into report_id;

  insert into cassandre_private.audit_log(actor,action,target_type,target_id,details)
  values('cassandre','daily_report_generated','daily_report',report_id::text,
         jsonb_build_object('report_date',report_day));
  return report_id;
end;
$$;
revoke all on function public.cassandre_save_report(jsonb) from public,anon,authenticated;
grant execute on function public.cassandre_save_report(jsonb) to service_role;

-- Tables fondatrices Cassandre attendues par la migration 20261109.
create table cassandre_private.agents (
  agent_key text primary key,
  display_role text not null,
  mission text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cassandre_private.tasks (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null references cassandre_private.agents(agent_key),
  title text not null,
  description text not null default '',
  status text not null default 'queued'
    constraint tasks_status_check check (status = any (array['queued','in_progress','blocked','needs_review','completed','cancelled']::text[])),
  priority text not null default 'normal'
    check (priority = any (array['low','normal','high','critical']::text[])),
  assigned_by text not null default 'cassandre',
  due_at timestamptz,
  result jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cassandre_tasks_agent_status_idx on cassandre_private.tasks(agent_key,status,created_at);

create table cassandre_private.decisions (
  id uuid primary key default gen_random_uuid(),
  decision_type text not null,
  summary text not null,
  rationale text not null default '',
  risk_level text not null default 'low'
    check (risk_level = any (array['low','medium','high','critical']::text[])),
  requires_founder_approval boolean not null default false,
  status text not null default 'executed'
    check (status = any (array['proposed','awaiting_founder','approved','rejected','executed']::text[])),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text,
  metadata jsonb not null default '{}'::jsonb
);

create table cassandre_private.daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null unique,
  results jsonb not null default '{}'::jsonb,
  problems jsonb not null default '[]'::jsonb,
  opportunities jsonb not null default '[]'::jsonb,
  decisions jsonb not null default '[]'::jsonb,
  priorities jsonb not null default '[]'::jsonb,
  executive_summary text not null default '',
  generated_at timestamptz not null default now(),
  status text not null default 'draft'
    check (status = any (array['draft','ready','delivered','failed']::text[]))
);

create table cassandre_private.audit_log (
  id bigint generated always as identity primary key,
  actor text not null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index cassandre_audit_created_idx on cassandre_private.audit_log(created_at desc);

insert into cassandre_private.agents(agent_key,display_role,mission) values
  ('commercial','Commercial','Ventes, conversions, abonnements, opportunités et résiliations.'),
  ('clients','Clients','Activité, fidélisation, risques et satisfaction des clients.'),
  ('nutrition','Nutrition','Cohérence des plans et journaux nutritionnels; alertes à examiner humainement.'),
  ('programmes','Programmes','Qualité, cohérence et état des programmes sportifs.'),
  ('technique','Technique','Incidents et intégrations; ne jamais prétendre lire des journaux indisponibles.'),
  ('finance','Financier','Indicateurs financiers vérifiables; aucune action de paiement ou tarif.')
on conflict (agent_key) do nothing;

alter table public.profils enable row level security;
alter table public.programmes enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.seances enable row level security;
alter table public.journal_seances enable row level security;
alter table public.bilans enable row level security;
alter table public.objectifs enable row level security;
alter table public.alertes enable row level security;
alter table public.journal_hydratation enable row level security;
alter table public.aliments enable row level security;
alter table public.questionnaires_programme enable row level security;
alter table public.exercices_programme enable row level security;
alter table public.exercices enable row level security;
alter table public.journal_repas enable row level security;
alter table cassandre_private.agents enable row level security;
alter table cassandre_private.tasks enable row level security;
alter table cassandre_private.decisions enable row level security;
alter table cassandre_private.daily_reports enable row level security;
alter table cassandre_private.audit_log enable row level security;

-- Fondation backend de test : aucun rôle navigateur n'a de privilège direct.
revoke all on public.profils, public.programmes, public.stripe_webhook_events,
  public.seances, public.journal_seances, public.bilans, public.objectifs,
  public.alertes, public.journal_hydratation, public.questionnaires_programme,
  public.exercices_programme, public.exercices, public.journal_repas, public.aliments from public, anon, authenticated;
grant select, insert, update, delete on public.profils, public.programmes,
  public.stripe_webhook_events, public.seances, public.journal_seances, public.bilans,
  public.objectifs, public.alertes, public.journal_hydratation, public.questionnaires_programme,
  public.exercices_programme, public.exercices, public.journal_repas, public.aliments to service_role;
revoke all on all tables in schema cassandre_private from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema cassandre_private to service_role;
grant usage, select on all sequences in schema cassandre_private to service_role;

commit;
