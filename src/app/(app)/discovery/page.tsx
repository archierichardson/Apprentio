import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/profile";
import { geocodePostcode } from "@/lib/vacancies/geocode";
import { haversineMiles, maxCommuteMiles } from "@/lib/vacancies/distance";
import { sectorsToFaaRoutes } from "@/lib/vacancies/sector-mapping";
import { parseGradeEligibilitySignal } from "@/lib/vacancies/grade-signal";
import { personalizeGradeSignal, type StudentGradeProfile } from "@/lib/vacancies/grade-match";
import type { FaaVacancy } from "@/lib/vacancies/faa-client";
import { getBaseCvText } from "@/lib/matching/cv-text-cache";
import { extractVacancyKeywords, prepareCvForMatching, scoreMatch } from "@/lib/matching/match-score";
import { getCuratedEmployersToWatch } from "@/lib/vacancies/employer-interest";
import { DiscoveryFilters } from "./DiscoveryFilters";
import { DiscoveryBoard, type VacancyMatch } from "./DiscoveryBoard";
import { NearMisses, type NearMissVacancy } from "./NearMisses";
import { EmployersToWatch } from "./EmployersToWatch";
import { getVacancyDetail, saveVacancy } from "./actions";

type VacancyRow = {
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
  latitude: number | null;
  longitude: number | null;
  raw_json: unknown;
  description: string | null;
};

const ANY = "any";

export default async function DiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    sectors?: string;
    level?: string;
    commute?: string;
    closing_within?: string;
    start_year?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await requireProfile<{
    onboarding_complete: boolean;
    sectors_of_interest: string[] | null;
    postcode: string | null;
    latitude: number | null;
    longitude: number | null;
    max_commute_minutes: number | null;
    minimum_apprenticeship_level: number | null;
    base_cv_storage_path: string | null;
    base_cv_extracted_text: string | null;
    subjects: string[] | null;
    grades: unknown;
    predicted_grades: unknown;
  }>(
    supabase,
    user.id,
    "onboarding_complete, sectors_of_interest, postcode, latitude, longitude, max_commute_minutes, minimum_apprenticeship_level, base_cv_storage_path, base_cv_extracted_text, subjects, grades, predicted_grades"
  );

  if (!profile.onboarding_complete) {
    redirect("/onboarding");
  }

  const studentGrades: StudentGradeProfile = {
    subjects: profile.subjects ?? [],
    grades: (profile.grades as Record<string, string> | null) ?? {},
    predictedGrades: (profile.predicted_grades as Record<string, string> | null) ?? {},
  };

  // Computed once per page load regardless of how many vacancy cards
  // render below -- the expensive part (download + PDF parse) only runs
  // once per CV thanks to the write-through cache; scoring each card
  // against the resulting keyword set is cheap in-memory work.
  const cvText = await getBaseCvText(
    supabase,
    user.id,
    profile.base_cv_storage_path,
    profile.base_cv_extracted_text
  );
  const preparedCv = cvText ? prepareCvForMatching(cvText) : null;

  // Each filter falls back to the profile's own default only when its param
  // is entirely absent from the URL -- once the user has touched a control
  // (including clearing it to "any"), that explicit choice always wins.
  // The sector filter itself speaks the real FAA route vocabulary directly
  // (DISCOVERY_SECTOR_OPTIONS) -- no lossy translation for anything picked
  // on this page; only the profile-derived default needs sectorsToFaaRoutes.
  const activeRoutes =
    params.sectors !== undefined
      ? params.sectors
        ? params.sectors.split(",")
        : []
      : sectorsToFaaRoutes(profile.sectors_of_interest ?? []);

  const activeLevel =
    params.level === undefined
      ? profile.minimum_apprenticeship_level
      : params.level === ANY
        ? null
        : Number(params.level);

  const activeCommute =
    params.commute === undefined
      ? profile.max_commute_minutes
      : params.commute === ANY
        ? null
        : Number(params.commute);

  const activeClosingWithin =
    params.closing_within && params.closing_within !== ANY ? params.closing_within : null;

  const activeStartYear = params.start_year || null;

  const routes = activeRoutes;
  const today = new Date().toISOString().slice(0, 10);

  let matches: VacancyMatch[] = [];
  let nearMisses: NearMissVacancy[] = [];
  let geocodeFailed = false;

  if (routes.length > 0 && profile.postcode) {
    // Cached on the profile at save time (applyProfileUpdate) -- falls back
    // to a one-time geocode + backfill for accounts that set their postcode
    // before that cache existed, so this self-heals rather than needing a
    // one-off migration script.
    let coords =
      profile.latitude != null && profile.longitude != null
        ? { latitude: profile.latitude, longitude: profile.longitude }
        : null;
    if (!coords) {
      coords = await geocodePostcode(profile.postcode);
      if (coords) {
        await supabase
          .from("profiles")
          .update({ latitude: coords.latitude, longitude: coords.longitude })
          .eq("user_id", user.id);
      }
    }
    if (!coords) {
      geocodeFailed = true;
    } else {
      // Level is intentionally NOT filtered server-side here (unlike commute,
      // which can't be without a second round-trip) -- vacancies that miss
      // only on level or distance are surfaced below as near-misses instead
      // of silently disappearing, so a student doesn't have to guess why a
      // sector match they saw elsewhere (e.g. a job board) isn't listed.
      let vacanciesQuery = supabase
        .from("vacancies")
        .select(
          "id, source, employer_name, role_title, apprenticeship_level, sector, location, postcode, closing_date, start_date, latitude, longitude, raw_json, description"
        )
        .gte("closing_date", today)
        .overlaps("sector", routes)
        .order("closing_date", { ascending: true });

      if (activeClosingWithin) {
        const cutoff = new Date(
          new Date(today).getTime() + Number(activeClosingWithin) * 86400000
        )
          .toISOString()
          .slice(0, 10);
        vacanciesQuery = vacanciesQuery.lte("closing_date", cutoff);
      }
      if (activeStartYear) {
        vacanciesQuery = vacanciesQuery
          .gte("start_date", `${activeStartYear}-01-01`)
          .lte("start_date", `${activeStartYear}-12-31`);
      }

      const { data: vacancies } = await vacanciesQuery.returns<VacancyRow[]>();

      const withDistance = (vacancies ?? [])
        .filter((v) => v.latitude != null && v.longitude != null)
        .map((v) => {
          const { raw_json, description, ...rest } = v;
          const qualifications =
            v.source === "gov_api" ? (raw_json as FaaVacancy | null)?.qualifications : undefined;
          return {
            ...rest,
            distanceMiles: haversineMiles(coords.latitude, coords.longitude, v.latitude!, v.longitude!),
            gradeSignal: v.source === "gov_api" ? parseGradeEligibilitySignal(qualifications) : null,
            personalizedGrade:
              v.source === "gov_api" ? personalizeGradeSignal(qualifications, studentGrades) : null,
            matchScore: preparedCv
              ? scoreMatch(
                  preparedCv,
                  extractVacancyKeywords({ source: v.source, rawJson: raw_json, description })
                )
              : null,
          };
        });

      const maxMiles = activeCommute != null ? maxCommuteMiles(activeCommute) : null;
      const fullMatches: VacancyMatch[] = [];
      const missed: NearMissVacancy[] = [];
      for (const v of withDistance) {
        const belowLevel = activeLevel != null && (v.apprenticeship_level ?? 0) < activeLevel;
        const tooFar = maxMiles != null && v.distanceMiles > maxMiles;
        if (!belowLevel && !tooFar) {
          fullMatches.push(v);
        } else {
          const reasons: NearMissVacancy["reasons"] = [];
          if (belowLevel) reasons.push("level");
          if (tooFar) reasons.push("distance");
          missed.push({ ...v, reasons });
        }
      }
      matches = fullMatches.sort((a, b) => a.distanceMiles - b.distanceMiles);
      nearMisses = missed.sort((a, b) => a.distanceMiles - b.distanceMiles);
    }
  }

  const { data: savedRows } = await supabase
    .from("applications")
    .select("vacancy_id")
    .eq("user_id", user.id);
  const savedIds = (savedRows ?? []).map((r) => r.vacancy_id);

  // Deliberately keyed on the profile's own sectors_of_interest, not the
  // page's vacancy-sector filter above (activeRoutes) -- those are two
  // different taxonomies now (FAA routes vs. onboarding's SECTOR_OPTIONS,
  // which is what employer_sources.sector actually uses), and "employers
  // I've told the app I'm interested in" shouldn't flicker based on which
  // vacancy-sector buttons happen to be toggled on this page right now.
  const [employersToWatch, { data: interestRows }] = await Promise.all([
    getCuratedEmployersToWatch(supabase, profile.sectors_of_interest ?? []),
    supabase.from("employer_interest_registrations").select("employer_source_id").eq("user_id", user.id),
  ]);
  const registeredEmployerIds = (interestRows ?? []).map((r) => r.employer_source_id);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8 sm:py-10">
      {params.error && <p className="text-sm text-destructive">{params.error}</p>}

      {geocodeFailed && (
        <p className="text-sm text-destructive">
          We couldn&apos;t locate the postcode on your profile ({profile.postcode}).{" "}
          <Link href="/profile" className="underline">
            Update it
          </Link>
          .
        </p>
      )}

      {profile.minimum_apprenticeship_level == null && activeLevel == null && (
        <p className="text-sm text-muted-foreground">
          You haven&apos;t set a minimum apprenticeship level, so results below aren&apos;t
          filtered by level unless you pick one below.
        </p>
      )}

      {!preparedCv && (
        <p className="text-sm text-muted-foreground">
          <Link href="/profile" className="underline">
            Upload your CV
          </Link>{" "}
          to see match strength for each vacancy below.
        </p>
      )}

      <DiscoveryFilters
        activeRoutes={activeRoutes}
        activeLevel={activeLevel}
        activeCommute={activeCommute}
        activeClosingWithin={activeClosingWithin}
        activeStartYear={activeStartYear}
        resultCount={matches.length}
      />

      {routes.length === 0 && (
        <p className="text-sm text-muted-foreground">No sectors selected. Pick one or more above.</p>
      )}

      {!geocodeFailed && routes.length > 0 && matches.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No vacancies currently match these filters. Try widening the commute radius or clearing
          a filter.
        </p>
      )}

      {!geocodeFailed && nearMisses.length > 0 && <NearMisses vacancies={nearMisses} />}

      <DiscoveryBoard
        matches={matches}
        savedIds={savedIds}
        saveVacancy={saveVacancy}
        getVacancyDetail={getVacancyDetail}
        studentGrades={studentGrades}
      />

      <EmployersToWatch employers={employersToWatch} registeredIds={registeredEmployerIds} />
    </main>
  );
}
