-- ============================================================
-- Instaworm CRM Schema
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";


-- ============================================================
-- PIPELINES
-- ============================================================
create table pipelines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

alter table pipelines enable row level security;
create policy "users can manage their own pipelines"
  on pipelines for all
  using (user_id = auth.uid());


-- ============================================================
-- PIPELINE STAGES
-- ============================================================
create table pipeline_stages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  name        text not null,
  "order"     integer not null default 0,
  color       text,
  created_at  timestamptz not null default now()
);

alter table pipeline_stages enable row level security;
create policy "users can manage their own pipeline stages"
  on pipeline_stages for all
  using (user_id = auth.uid());


-- ============================================================
-- CUSTOM FIELD DEFINITIONS
-- ============================================================
create table custom_field_definitions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  entity_type text not null default 'lead' check (entity_type in ('lead', 'client')),
  name        text not null,
  type        text not null check (type in ('text', 'number', 'date', 'select')),
  options     jsonb,
  created_at  timestamptz not null default now()
);

alter table custom_field_definitions enable row level security;
create policy "users can manage their own custom field definitions"
  on custom_field_definitions for all
  using (user_id = auth.uid());


-- ============================================================
-- LEADS
-- ============================================================
create table leads (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  first_name      text not null,
  last_name       text,
  email           text,
  phone           text,
  website         text,
  company         text,
  job_title       text,
  pipeline_id     uuid references pipelines(id) on delete set null,
  stage_id        uuid references pipeline_stages(id) on delete set null,
  estimated_value numeric,
  lead_quality    text check (lead_quality in ('high', 'medium', 'low')),
  notes           text,
  custom_fields   jsonb not null default '{}',
  is_client       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table leads enable row level security;
create policy "users can manage their own leads"
  on leads for all
  using (user_id = auth.uid());


-- ============================================================
-- CLIENTS
-- ============================================================
create table clients (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  lead_id         uuid not null references leads(id) on delete cascade,
  contract_value  numeric,
  client_since    date,
  renewal_date    date,
  status          text not null default 'active' check (status in ('active', 'at_risk', 'churned')),
  custom_fields   jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table clients enable row level security;
create policy "users can manage their own clients"
  on clients for all
  using (user_id = auth.uid());


-- ============================================================
-- ACTIVITY ENTRIES
-- ============================================================
create table activity_entries (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  lead_id             uuid not null references leads(id) on delete cascade,
  type                text not null check (type in ('note', 'document', 'stage_change', 'lead_created', 'client_converted')),
  title               text not null,
  description         text,
  attachment          jsonb,
  pipeline_id         uuid references pipelines(id) on delete set null,
  previous_stage_id   uuid references pipeline_stages(id) on delete set null,
  new_stage_id        uuid references pipeline_stages(id) on delete set null,
  system_generated    boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table activity_entries enable row level security;
create policy "users can manage their own activity entries"
  on activity_entries for all
  using (user_id = auth.uid());


-- ============================================================
-- SETTINGS
-- ============================================================
create table settings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  currency_code text not null default 'USD',
  updated_at    timestamptz not null default now()
);

alter table settings enable row level security;
create policy "users can manage their own settings"
  on settings for all
  using (user_id = auth.uid());
