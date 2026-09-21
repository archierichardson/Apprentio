-- Staging/review queue for the automated employer-vacancy checker
-- (src/app/api/cron/check-employer-vacancies): an AI web-search extraction
-- can misread a field (wrong closing date, wrong apply link) and those go
-- straight to a real student relying on it -- so finds land here and wait
-- for an admin to confirm (or dismiss) before ever reaching public.vacancies.
-- No public-select policy: this is unvetted data, admin-only.
create table public.employer_vacancy_leads (
  id uuid primary key default gen_random_uuid(),
  employer_source_id uuid not null references public.employer_sources (id) on delete cascade,
  role_title text not null,
  apprenticeship_level int,
  closing_date date,
  start_date date,
  apply_url text,
  location text,
  description text,
  raw_extraction jsonb,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'dismissed')),
  found_at timestamptz not null default now(),
  confirmed_vacancy_id uuid references public.vacancies (id)
);

alter table public.employer_vacancy_leads enable row level security;

-- Plain (non-partial) unique constraint -- PostgREST's upsert can't target
-- a partial-index conflict, so "refresh while pending, never clobber a
-- confirmed/dismissed row" is enforced in application code (the cron route
-- selects first and branches) rather than at the constraint level.
create unique index employer_vacancy_leads_employer_role_unique
  on public.employer_vacancy_leads (employer_source_id, role_title);

-- Distinct from employer_sources.last_verified_at (admin-set, means "I
-- personally confirmed this research"). This one is written by the checker
-- itself and used purely to pick the next batch (oldest-checked-first).
alter table public.employer_sources
  add column last_checked_at timestamptz;
