import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkEmployerForVacancies } from "@/lib/vacancies/employer-vacancy-check";
import { slugify } from "@/lib/vacancies/curated";

// Vercel Hobby caps functions at 60s, and a single AI web-search check can
// take 40-90s on its own (see employer-vacancy-check.ts) -- so this only
// ever checks a small batch per run, oldest-checked-first, run concurrently
// so wall-clock is bounded by the slowest check, not the sum. The full
// employer_sources roster cycles over several days, not every run -- fine
// for a domain where application windows open over months.
const BATCH_SIZE = 2;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: employers, error: employersError } = await admin
    .from("employer_sources")
    .select("id, employer_name, portal_url")
    .not("portal_url", "is", null)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE);

  if (employersError) {
    return NextResponse.json({ ok: false, error: employersError.message }, { status: 500 });
  }

  const results = await Promise.all(
    (employers ?? []).map(async (employer) => {
      const result = await checkEmployerForVacancies(employer);

      await admin
        .from("employer_sources")
        .update({ last_checked_at: new Date().toISOString() })
        .eq("id", employer.id);

      if (!result.ok) {
        return { employer: employer.employer_name, error: result.error, leadsFound: 0 };
      }

      let leadsFound = 0;
      for (const lead of result.leads) {
        // Already published under this employer+role -- not a new find.
        const externalId = slugify(`${employer.employer_name}-${lead.role_title}`);
        const { data: existingVacancy } = await admin
          .from("vacancies")
          .select("id")
          .eq("source", "curated")
          .eq("external_id", externalId)
          .maybeSingle();
        if (existingVacancy) continue;

        // Select-then-branch, not a blind upsert: PostgREST's upsert
        // targets a plain unique constraint, so refreshing a still-pending
        // lead while never clobbering one already confirmed/dismissed has
        // to be enforced here, not at the DB level.
        const { data: existingLead } = await admin
          .from("employer_vacancy_leads")
          .select("id, status")
          .eq("employer_source_id", employer.id)
          .eq("role_title", lead.role_title)
          .maybeSingle();

        if (existingLead && existingLead.status !== "pending") continue;

        const leadRow = {
          employer_source_id: employer.id,
          role_title: lead.role_title,
          apprenticeship_level: lead.apprenticeship_level,
          closing_date: lead.closing_date,
          start_date: lead.start_date,
          apply_url: lead.apply_url,
          location: lead.location,
          description: lead.description,
          raw_extraction: result.raw,
          found_at: new Date().toISOString(),
        };

        const { error: writeError } = existingLead
          ? await admin.from("employer_vacancy_leads").update(leadRow).eq("id", existingLead.id)
          : await admin.from("employer_vacancy_leads").insert(leadRow);
        if (!writeError) leadsFound += 1;
      }

      return { employer: employer.employer_name, leadsFound };
    })
  );

  return NextResponse.json({ ok: true, checked: results.length, results });
}
