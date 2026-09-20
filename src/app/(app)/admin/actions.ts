"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import {
  upsertCuratedVacancy,
  validateCuratedVacancyInput,
  type CuratedVacancyInput,
} from "@/lib/vacancies/curated";

const PORTAL_TYPES = ["direct", "ucas", "findapprenticeship"] as const;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    redirect("/login");
  }
  return user;
}

function readEmployerFields(formData: FormData) {
  const employerName = (formData.get("employer_name") as string | null)?.trim() ?? "";
  const portalUrl = (formData.get("portal_url") as string | null)?.trim() || null;
  const portalTypeRaw = formData.get("portal_type") as string | null;
  const portalType = (PORTAL_TYPES as readonly string[]).includes(portalTypeRaw ?? "")
    ? portalTypeRaw
    : null;
  const verifiedLevel = (formData.get("verified_level") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const sector = formData.getAll("sector") as string[];
  return { employerName, portalUrl, portalType, verifiedLevel, notes, sector };
}

export async function addEmployerSource(formData: FormData) {
  await requireAdmin();

  const { employerName, portalUrl, portalType, verifiedLevel, notes, sector } =
    readEmployerFields(formData);

  if (!employerName) {
    redirect("/admin?error=Employer name is required");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("employer_sources").insert({
    employer_name: employerName,
    portal_url: portalUrl,
    portal_type: portalType,
    verified_level: verifiedLevel,
    notes,
    sector,
    last_verified_at: new Date().toISOString(),
  });

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
}

export async function updateEmployerSource(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    redirect("/admin?error=Missing employer id");
  }

  const { employerName, portalUrl, portalType, verifiedLevel, notes, sector } =
    readEmployerFields(formData);

  if (!employerName) {
    redirect("/admin?error=Employer name is required");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("employer_sources")
    .update({
      employer_name: employerName,
      portal_url: portalUrl,
      portal_type: portalType,
      verified_level: verifiedLevel,
      notes,
      sector,
      last_verified_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
}

export async function addCuratedVacancy(formData: FormData) {
  await requireAdmin();

  const raw: Record<string, unknown> = {
    employer_name: formData.get("employer_name"),
    role_title: formData.get("role_title"),
    apprenticeship_level: formData.get("apprenticeship_level"),
    closing_date: formData.get("closing_date"),
    start_date: (formData.get("start_date") as string | null) || undefined,
    apply_url: formData.get("apply_url"),
    sector: formData.getAll("sector"),
    standard_reference: (formData.get("standard_reference") as string | null) || undefined,
    location: (formData.get("location") as string | null) || undefined,
    postcode: (formData.get("postcode") as string | null) || undefined,
    description: (formData.get("description") as string | null) || undefined,
  };

  let input: CuratedVacancyInput;
  try {
    input = validateCuratedVacancyInput(raw, "New curated vacancy");
  } catch (err) {
    redirect(
      `/admin?error=${encodeURIComponent(err instanceof Error ? err.message : "Invalid vacancy")}`
    );
  }

  const admin = createAdminClient();
  const result = await upsertCuratedVacancy(admin, input);

  if (!result.ok) {
    redirect(`/admin?error=${encodeURIComponent(result.error)}`);
  }

  const message =
    result.warnings.length > 0
      ? `Added — ${result.warnings.join(" ")}`
      : `Added ${input.role_title}`;
  revalidatePath("/admin");
  redirect(`/admin?success=${encodeURIComponent(message)}`);
}
