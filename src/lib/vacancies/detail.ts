import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type VacancyDetail = {
  id: string;
  source: "gov_api" | "curated";
  employer_name: string;
  role_title: string;
  apprenticeship_level: number | null;
  sector: string[];
  location: string | null;
  postcode: string | null;
  closing_date: string | null;
  start_date: string | null;
  possibly_closed_at: string | null;
  apply_url: string | null;
  description: string | null;
  raw_json: unknown;
  employer_sources: { portal_url: string | null } | null;
};

// Shared by the dedicated /vacancies/[id] page and the Discovery split-pane
// (fetched client-side via a server action on selection) so both render from
// the exact same query and data shape.
export async function fetchVacancyDetail(
  supabase: SupabaseServerClient,
  id: string
): Promise<VacancyDetail | null> {
  const { data } = await supabase
    .from("vacancies")
    .select(
      "id, source, employer_name, role_title, apprenticeship_level, sector, location, postcode, closing_date, start_date, possibly_closed_at, apply_url, description, raw_json, employer_sources(portal_url)"
    )
    .eq("id", id)
    .maybeSingle<VacancyDetail>();

  return data;
}
