-- employer_sources had no sector tag at all, so "Employers to watch" on
-- Discovery was hardcoded to only ever show up for Cybersecurity-interested
-- students (the only sector the 16 seeded rows were ever researched for).
-- Uses the SECTOR_OPTIONS vocabulary (profiles.sectors_of_interest), not
-- vacancies.sector's FAA-route vocabulary -- the latter collapses distinct
-- SECTOR_OPTIONS values (e.g. Cybersecurity and Government & Defence both
-- map to "Protective services"), which would leak an employer onto an
-- unrelated sector's watch list.
alter table public.employer_sources
  add column sector text[] not null default '{}';

update public.employer_sources
  set sector = array['Cybersecurity'];

-- These three already run general-tech programmes alongside their cyber
-- track (confirmed live: Barclays' and Cisco's actual open listings today
-- are plain Digital/tech roles, not cyber-specific) -- tag them for both so
-- a Software-Engineering-interested (non-cyber) student sees them too.
update public.employer_sources
  set sector = array['Cybersecurity', 'Software Engineering']
  where employer_name in ('Barclays', 'Cisco UK', 'IBM UK');
