import type { SupabaseClient } from "@supabase/supabase-js";
import { geocodePostcode } from "./geocode";
import { sectorsToFaaRoutes } from "./sector-mapping";
import { notifyEmployerWatchers } from "@/lib/notifications/vacancy-watch-alert";

export type CuratedVacancyInput = {
  employer_name: string;
  role_title: string;
  apprenticeship_level: number;
  closing_date: string;
  start_date?: string;
  apply_url: string;
  sector?: string[];
  standard_reference?: string;
  location?: string;
  postcode?: string;
  description?: string;
  external_id?: string;
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateCuratedVacancyInput(
  input: unknown,
  label: string | number
): CuratedVacancyInput {
  if (typeof input !== "object" || input === null) {
    throw new Error(`${label}: not an object`);
  }
  const v = input as Record<string, unknown>;
  const missing = [
    "employer_name",
    "role_title",
    "apprenticeship_level",
    "closing_date",
    "apply_url",
  ].filter((key) => v[key] === undefined || v[key] === null || v[key] === "");
  if (missing.length > 0) {
    throw new Error(`${label}: missing required field(s): ${missing.join(", ")}`);
  }
  const level = Number(v.apprenticeship_level);
  if (!Number.isInteger(level) || level < 2 || level > 7) {
    throw new Error(`${label}: apprenticeship_level must be an integer 2-7`);
  }
  return { ...v, apprenticeship_level: level } as CuratedVacancyInput;
}

export type UpsertCuratedVacancyResult =
  | { ok: true; externalId: string; vacancyId: string; warnings: string[] }
  | { ok: false; error: string };

// Shared by scripts/add-curated-vacancy.ts (JSON-file/CLI workflow) and the
// admin page's "Add curated vacancy" form — same validation, geocoding, and
// sector-mapping either way, so a vacancy added through one route is
// discoverable identically to one added through the other.
export async function upsertCuratedVacancy(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  input: CuratedVacancyInput
): Promise<UpsertCuratedVacancyResult> {
  const warnings: string[] = [];

  const { data: employer, error: employerError } = await supabase
    .from("employer_sources")
    .select("id")
    .eq("employer_name", input.employer_name)
    .maybeSingle();

  if (employerError) {
    return { ok: false, error: `Employer lookup failed: ${employerError.message}` };
  }
  if (!employer) {
    return {
      ok: false,
      error: `"${input.employer_name}" not found in employer_sources — add it as an employer first, or fix the spelling.`,
    };
  }

  let latitude: number | null = null;
  let longitude: number | null = null;
  if (input.postcode) {
    const coords = await geocodePostcode(input.postcode);
    if (coords) {
      latitude = coords.latitude;
      longitude = coords.longitude;
    } else {
      warnings.push(
        `Couldn't geocode postcode "${input.postcode}" — distance filtering won't include this vacancy.`
      );
    }
  }

  const mappedSector = sectorsToFaaRoutes(input.sector ?? []);
  if ((input.sector ?? []).length > 0 && mappedSector.length === 0) {
    warnings.push(
      `None of ${JSON.stringify(input.sector)} mapped to a matchable category — check spelling against SECTOR_OPTIONS.`
    );
  }

  const externalId = input.external_id ?? slugify(`${input.employer_name}-${input.role_title}`);

  const row = {
    source: "curated" as const,
    external_id: externalId,
    employer_source_id: employer.id,
    employer_name: input.employer_name,
    role_title: input.role_title,
    apprenticeship_level: input.apprenticeship_level,
    sector: mappedSector,
    standard_reference: input.standard_reference ?? null,
    location: input.location ?? null,
    postcode: input.postcode ?? null,
    latitude,
    longitude,
    closing_date: input.closing_date,
    start_date: input.start_date ?? null,
    apply_url: input.apply_url,
    description: input.description ?? null,
    raw_json: input,
    last_synced_at: new Date().toISOString(),
  };

  const { data: upserted, error } = await supabase
    .from("vacancies")
    .upsert(row, { onConflict: "source,external_id" })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: `Upsert failed: ${error.message}` };
  }

  const { notified, errors: notifyErrors } = await notifyEmployerWatchers(supabase, {
    employerSourceId: employer.id,
    employerName: input.employer_name,
    roleTitle: input.role_title,
    vacancyId: upserted.id,
  });
  if (notified > 0) {
    warnings.push(`Notified ${notified} student(s) who registered interest in ${input.employer_name}.`);
  }
  warnings.push(...notifyErrors.map((e) => `Notify: ${e}`));

  return { ok: true, externalId, vacancyId: upserted.id, warnings };
}
