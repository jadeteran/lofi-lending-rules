-- Dedicated table for learned condition -> responsibility rules.
-- Run this against your external (LOFI_SUPABASE) project — e.g. paste into the
-- Supabase SQL editor, or run with `psql "$LOFI_DATABASE_URL" -f` this file.
--
-- Replaces the previous "sentinel row" hack inside public.saved_scenarios
-- (a row keyed by selected_program = '__dept_rules__').

-- 1) Table
create table if not exists public.dept_rules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  keywords text not null default '',
  responsibility text not null,
  updated_at timestamptz not null default now()
);

-- Case-insensitive uniqueness on title so re-learning a rule upserts cleanly.
create unique index if not exists dept_rules_title_lower_idx
  on public.dept_rules (lower(title));

-- 2) Grants (the Data API needs explicit grants on public-schema tables).
grant select, insert, update, delete on public.dept_rules to authenticated;
grant all on public.dept_rules to service_role;
-- Department rules are non-sensitive operational config; the server reads them
-- with the anon key as a fallback when the service role key is absent.
grant select on public.dept_rules to anon;

-- 3) RLS
alter table public.dept_rules enable row level security;

-- Anyone (anon or authenticated) may read the rules.
drop policy if exists "dept_rules read" on public.dept_rules;
create policy "dept_rules read"
  on public.dept_rules for select
  to anon, authenticated
  using (true);

-- Only authenticated users may write rules (the server uses the service role
-- key, which bypasses RLS regardless).
drop policy if exists "dept_rules insert" on public.dept_rules;
create policy "dept_rules insert"
  on public.dept_rules for insert
  to authenticated
  with check (true);

drop policy if exists "dept_rules update" on public.dept_rules;
create policy "dept_rules update"
  on public.dept_rules for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "dept_rules delete" on public.dept_rules;
create policy "dept_rules delete"
  on public.dept_rules for delete
  to authenticated
  using (true);

-- 4) One-time data migration: copy any existing learned rules out of the
-- saved_scenarios sentinel row into the new table, then drop the sentinel row.
insert into public.dept_rules (title, keywords, responsibility, updated_at)
select
  coalesce(nullif(trim(rule->>'title'), ''), 'Condition') as title,
  coalesce(rule->>'keywords', '') as keywords,
  coalesce(nullif(trim(rule->>'responsibility'), ''), 'Other') as responsibility,
  coalesce((rule->>'updatedAt')::timestamptz, now()) as updated_at
from public.saved_scenarios s
cross join lateral jsonb_array_elements(
  coalesce(s.analysis_output->'rules', '[]'::jsonb)
) as rule
where s.selected_program = '__dept_rules__'
on conflict (lower(title)) do update
  set keywords = excluded.keywords,
      responsibility = excluded.responsibility,
      updated_at = excluded.updated_at;

delete from public.saved_scenarios where selected_program = '__dept_rules__';
