-- Staging queue for the employer-discovery cron (src/app/api/cron/discover-employers):
-- an AI web-search pass looking for employers NOT already in employer_sources with a
-- currently open Level 6/7 listing. Mirrors employer_vacancy_leads' review-before-trust
-- shape -- a wrong employer name or portal guess here would otherwise land straight on
-- the watchlist that check-employer-vacancies trusts and re-checks daily.
-- No public-select policy: unvetted data, admin-only, same as employer_vacancy_leads.
create table public.employer_discovery_candidates (
  id uuid primary key default gen_random_uuid(),
  employer_name text not null,
  portal_url text,
  sector text[] not null default '{}',
  evidence_url text,
  evidence_note text,
  status text not null default 'pending' check (status in ('pending', 'added', 'dismissed')),
  found_at timestamptz not null default now()
);

alter table public.employer_discovery_candidates enable row level security;

-- Case-insensitive: the same employer surfacing again next week under
-- identical casing shouldn't re-queue a second pending row. Not a defence
-- against genuine near-duplicates ("KPMG" vs "KPMG UK") -- the discovery
-- lib's isEmployerKnown check (tolerant substring match, same approach as
-- employer-vacancy-check.ts's isRoleStillListed) is the first line of
-- defence for those; an admin reviewing the queue is the second.
create unique index employer_discovery_candidates_name_unique
  on public.employer_discovery_candidates (lower(employer_name));
