"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GRADE_OPTIONS, SECTOR_OPTIONS } from "./constants";
import { applyDocumentUploads } from "./documents-actions";
import { geocodePostcode } from "@/lib/vacancies/geocode";

function parseJsonArray(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function parseGradeMap(
  raw: FormDataEntryValue | null,
  subjects: string[]
): Record<string, string> {
  if (typeof raw !== "string") return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null) return {};
  const entries = Object.entries(parsed as Record<string, unknown>).filter(
    (entry): entry is [string, string] =>
      subjects.includes(entry[0]) &&
      typeof entry[1] === "string" &&
      (GRADE_OPTIONS as readonly string[]).includes(entry[1])
  );
  return Object.fromEntries(entries);
}

// Core validation + write, no redirect -- shared by the merged saveProfile
// action below. Returns error strings; empty means the update succeeded.
async function applyProfileUpdate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  formData: FormData
): Promise<string[]> {
  const subjects = parseJsonArray(formData.get("subjects_json")).filter(
    (s) => s.trim().length > 0
  );
  const grades = parseGradeMap(formData.get("grades_json"), subjects);
  const predictedGrades = parseGradeMap(
    formData.get("predicted_grades_json"),
    subjects
  );
  const sectorsOfInterest = formData
    .getAll("sectors")
    .filter(
      (s): s is string =>
        typeof s === "string" && (SECTOR_OPTIONS as readonly string[]).includes(s)
    );
  const postcode = (formData.get("postcode") as string | null)?.trim() ?? "";
  const maxCommuteMinutes = Number(formData.get("max_commute_minutes"));
  const rightToWorkRaw = formData.get("right_to_work");
  const fullName = (formData.get("full_name") as string | null)?.trim() ?? "";
  const schoolYear = (formData.get("school_year") as string | null)?.trim() ?? "";
  const securityClearanceRaw = formData.get("security_clearance_eligible");
  const minimumApprenticeshipLevel = Number(
    formData.get("minimum_apprenticeship_level")
  );

  const errors: string[] = [];
  if (!fullName) errors.push("Full name is required");
  if (!schoolYear) errors.push("School year is required");
  if (subjects.length === 0) errors.push("Add at least one subject");
  if (sectorsOfInterest.length === 0) errors.push("Pick at least one sector");
  if (!postcode) errors.push("Postcode is required");
  if (!Number.isFinite(maxCommuteMinutes) || maxCommuteMinutes <= 0)
    errors.push("Pick a commute radius");
  if (rightToWorkRaw !== "yes" && rightToWorkRaw !== "no")
    errors.push("Right-to-work status is required");
  if (
    !Number.isInteger(minimumApprenticeshipLevel) ||
    minimumApprenticeshipLevel < 2 ||
    minimumApprenticeshipLevel > 7
  )
    errors.push("Pick a minimum apprenticeship level");

  if (errors.length > 0) return errors;

  const securityClearanceEligible =
    securityClearanceRaw === "yes"
      ? true
      : securityClearanceRaw === "no"
        ? false
        : null;

  // Only re-geocode when the postcode actually changed -- Discovery reads
  // latitude/longitude straight off the profile instead of hitting
  // postcodes.io on every page load (was happening on every single filter
  // click). A failed geocode doesn't block the save; Discovery already
  // handles a missing/bad postcode with its own "couldn't locate" message.
  const { data: current } = await supabase
    .from("profiles")
    .select("postcode")
    .eq("user_id", userId)
    .single();

  let latitude: number | null = null;
  let longitude: number | null = null;
  if (current?.postcode !== postcode) {
    const coords = await geocodePostcode(postcode);
    latitude = coords?.latitude ?? null;
    longitude = coords?.longitude ?? null;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      school_year: schoolYear,
      subjects,
      grades,
      predicted_grades: predictedGrades,
      sectors_of_interest: sectorsOfInterest,
      max_commute_minutes: maxCommuteMinutes,
      postcode,
      ...(current?.postcode !== postcode ? { latitude, longitude } : {}),
      right_to_work: rightToWorkRaw === "yes",
      security_clearance_eligible: securityClearanceEligible,
      minimum_apprenticeship_level: minimumApprenticeshipLevel,
      onboarding_complete: true,
    })
    .eq("user_id", userId);

  return error ? [error.message] : [];
}

// The single save action for both the first-time onboarding form and the
// /profile edit page. Runs the profile update and (if any files were
// selected) the document upload in the same submit, so there's no way to
// save one half and silently lose the other -- previously these were two
// separate forms/buttons on the same page, and clicking the profile-fields
// button discarded any selected CV/cover letter without ever uploading it.
export async function saveProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const returnTo = (formData.get("return_to") as string | null) || "/onboarding";
  const isInitialSetup = returnTo === "/onboarding";

  const errors = [
    ...(await applyProfileUpdate(supabase, user.id, formData)),
    ...(await applyDocumentUploads(supabase, user.id, formData)),
  ];

  if (errors.length > 0) {
    redirect(`${returnTo}?error=${encodeURIComponent(errors.join("; "))}`);
  }

  redirect(isInitialSetup ? "/dashboard" : `${returnTo}?success=1`);
}
