-- Diagnostics storage and admin panel access. Source of truth: docs/spec.md, sections 8 and 9.
--
-- Access model:
--   * Visitors never touch these tables. A server route inserts with the secret key,
--     which bypasses RLS.
--   * Only users listed in panel_users can read diagnostics: admin reads all rows,
--     demo reads only rows with is_demo = true.
--   * No insert, update or delete policies exist, so the panel is read-only.

-- Users allowed into the admin panel.
create table public.panel_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'demo')),
  created_at timestamptz not null default now()
);

alter table public.panel_users enable row level security;
-- No policies: nobody reads or writes this table through the API.
revoke all on table public.panel_users from anon, authenticated;

-- Role of the current user, used by the diagnostics policies.
-- It lives in a schema the API does not expose, and runs as its owner so it can read
-- panel_users without granting that table to anyone.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create function private.panel_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.panel_users where user_id = (select auth.uid());
$$;

revoke all on function private.panel_role() from public;
grant execute on function private.panel_role() to authenticated;

-- One row per completed diagnostic.
create table public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company text not null check (char_length(company) between 1 and 200),
  contact_name text not null check (char_length(contact_name) between 1 and 200),
  email text not null check (char_length(email) between 3 and 320 and email like '%_@_%'),
  industry text not null check (industry in (
    'Construction',
    'Manufacturing',
    'Wholesale & distribution',
    'Retail',
    'Transportation & logistics',
    'Energy (oil & gas)',
    'Professional services (legal, accounting, consulting)',
    'Healthcare',
    'Real estate',
    'Hospitality & food services',
    'Other'
  )),
  company_size text not null check (company_size in ('1-10', '11-50', '51-200')),
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  scores jsonb not null check (jsonb_typeof(scores) = 'object'),
  level smallint not null check (level between 1 and 3),
  report jsonb,
  consent boolean not null check (consent),
  -- SHA-256 hex of the visitor IP with a secret salt; null for demo rows.
  ip_hash text check (ip_hash ~ '^[0-9a-f]{64}$'),
  is_demo boolean not null default false
);

-- Panel list, newest first.
create index diagnostics_created_at_idx on public.diagnostics (created_at desc);
-- Rate limit lookup: submissions from one IP hash in the last hour.
create index diagnostics_ip_hash_created_at_idx on public.diagnostics (ip_hash, created_at desc);

alter table public.diagnostics enable row level security;

-- Read-only access through the API: visitors get nothing, panel users may only select.
revoke all on table public.diagnostics from anon, authenticated;
grant select on table public.diagnostics to authenticated;

create policy "Panel admins read all diagnostics"
  on public.diagnostics
  for select
  to authenticated
  using ((select private.panel_role()) = 'admin');

create policy "Demo user reads demo diagnostics"
  on public.diagnostics
  for select
  to authenticated
  using (is_demo and (select private.panel_role()) = 'demo');
