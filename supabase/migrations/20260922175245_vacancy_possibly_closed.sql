-- Cisco and L'Oréal's curated listings closed on the employer's own site
-- days before the closing_date Apprentio was still showing -- a student
-- (Archie) found out only by clicking a dead apply link. gov_api vacancies
-- self-correct nightly via the FAA sync; curated vacancies were static
-- once added, with nothing watching them. Set the moment a re-check's
-- fresh employer search doesn't include a currently-published role;
-- cleared automatically the next time a check does find it again, so one
-- flaky/incomplete search doesn't permanently mislabel a genuinely open
-- role (see check-employer-vacancies route.ts).
alter table public.vacancies
  add column possibly_closed_at timestamptz;
