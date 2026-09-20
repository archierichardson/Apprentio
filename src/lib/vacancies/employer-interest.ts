import type { SupabaseClient } from "@supabase/supabase-js";

export type EmployerToWatch = {
  id: string;
  employer_name: string;
  portal_url: string | null;
  opensHint: string | null;
};


// employer_sources.notes is free text (hand-curated research, not a
// structured field) but 13 of the current 16 rows carry a consistent
// "Opens <Month> <Year>" annotation — confirmed by reading the real notes,
// not assumed. This is a display-only best-effort extraction: if a note
// doesn't match, the hint is just omitted rather than guessed at.
const OPENS_PATTERN = /Opens\s+([A-Za-z]+\.?\s*\d{4}|early\s+\d{4})/i;

export function extractOpensHint(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(OPENS_PATTERN);
  return match ? match[1].trim() : null;
}

export async function getCuratedEmployersToWatch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  // Empty array is a genuine "watch nothing" outcome (Postgres `&&` against
  // `'{}'` never overlaps), not a "show everything" fallback — a student
  // with no sectors selected yet shouldn't see every tracked employer.
  activeSectors: string[]
): Promise<EmployerToWatch[]> {
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: employers }, { data: liveVacancies }] = await Promise.all([
    supabase
      .from("employer_sources")
      .select("id, employer_name, portal_url, notes")
      .overlaps("sector", activeSectors)
      .order("employer_name"),
    supabase
      .from("vacancies")
      .select("employer_source_id")
      .eq("source", "curated")
      .gte("closing_date", today)
      .not("employer_source_id", "is", null),
  ]);

  const employersWithLiveVacancy = new Set(
    (liveVacancies ?? []).map((v: { employer_source_id: string }) => v.employer_source_id)
  );

  return (employers ?? [])
    .filter((e: { id: string }) => !employersWithLiveVacancy.has(e.id))
    .map((e: { id: string; employer_name: string; portal_url: string | null; notes: string | null }) => ({
      id: e.id,
      employer_name: e.employer_name,
      portal_url: e.portal_url,
      opensHint: extractOpensHint(e.notes),
    }));
}
