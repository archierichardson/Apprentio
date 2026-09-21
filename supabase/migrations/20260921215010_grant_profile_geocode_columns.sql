-- profiles.latitude/longitude (added in 20260921185001) were never added
-- to the column-level UPDATE allow-list from 20260806091337 -- confirmed
-- live: a real authenticated session hit "permission denied for table
-- profiles" (42501) the moment either the Discovery self-heal write-back
-- or applyProfileUpdate's save-time geocode tried to set them, since
-- authenticated has no table-wide UPDATE on profiles, only the explicit
-- per-column grant. Worse than a silently-skipped column: because the
-- UPDATE statement is atomic, this failed the ENTIRE profile save (not
-- just latitude/longitude) whenever a postcode change was included in the
-- same submit -- a real regression in onboarding/profile-editing, not
-- just in tonight's new caching feature. Same pattern as
-- 20260813214208_grant_base_cv_extracted_text.sql.
GRANT UPDATE (latitude, longitude) ON public.profiles TO authenticated;

NOTIFY pgrst, 'reload schema';
