-- Discovery re-geocoded the student's postcode via postcodes.io on every
-- single page load -- including every filter button click, since each one
-- is a full server navigation. Confirmed live: a cold call took 3.2s, warm
-- calls ~100ms -- either way, redundant work on every click when the
-- postcode itself hasn't changed. Cached here (written once at profile
-- save time in applyProfileUpdate, src/app/onboarding/actions.ts) so
-- Discovery reads it directly instead of re-fetching.
alter table public.profiles
  add column latitude double precision,
  add column longitude double precision;

-- vacancies.sector is filtered via .overlaps() on every Discovery request
-- (10,587 rows and growing via the nightly sync) with no supporting index.
create index vacancies_sector_gin_idx on public.vacancies using gin (sector);
