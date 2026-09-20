import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/resend";

// Fires when a curated vacancy is added/updated for an employer students
// have registered interest in (see employer_interest_registrations). Deletes
// each registration after a successful send so re-running the same curated
// upsert (edits, re-syncs) never re-notifies the same student twice — once
// the employer has a live vacancy, "register interest" has served its
// purpose. Email failures are collected, not thrown: a bad send must never
// roll back the vacancy write that already succeeded.
export async function notifyEmployerWatchers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: SupabaseClient<any, any, any>,
  params: {
    employerSourceId: string;
    employerName: string;
    roleTitle: string;
    vacancyId: string;
  }
): Promise<{ notified: number; errors: string[] }> {
  const { data: registrations, error: fetchError } = await admin
    .from("employer_interest_registrations")
    .select("id, user_id")
    .eq("employer_source_id", params.employerSourceId);

  if (fetchError) {
    return { notified: 0, errors: [`Lookup failed: ${fetchError.message}`] };
  }
  if (!registrations || registrations.length === 0) {
    return { notified: 0, errors: [] };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://apprentio.app";
  const vacancyUrl = `${siteUrl}/vacancies/${params.vacancyId}`;
  const errors: string[] = [];
  let notified = 0;

  for (const registration of registrations) {
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(
      registration.user_id
    );
    const email = userData?.user?.email;
    if (userError || !email) {
      errors.push(`No email for user ${registration.user_id}: ${userError?.message ?? "missing"}`);
      continue;
    }

    const result = await sendEmail({
      to: email,
      subject: `${params.employerName} just opened an apprenticeship`,
      html: `
        <p>${params.employerName} — an employer you registered interest in — has a new vacancy live:</p>
        <p><strong>${params.roleTitle}</strong></p>
        <p><a href="${vacancyUrl}">View it on Apprentio</a></p>
      `,
    });

    if (!result.ok) {
      errors.push(`Send failed for ${email}: ${result.error}`);
      continue;
    }

    const { error: deleteError } = await admin
      .from("employer_interest_registrations")
      .delete()
      .eq("id", registration.id);
    if (deleteError) {
      errors.push(`Sent to ${email} but failed to clear registration: ${deleteError.message}`);
    }

    notified += 1;
  }

  return { notified, errors };
}
