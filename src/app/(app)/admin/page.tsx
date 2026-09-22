import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { SECTOR_OPTIONS } from "@/app/onboarding/constants";
import {
  addCuratedVacancy,
  addEmployerSource,
  confirmVacancyClosed,
  dismissEmployerVacancyLead,
  markVacancyStillOpen,
  updateEmployerSource,
} from "./actions";

const PORTAL_TYPE_OPTIONS = ["direct", "ucas", "findapprenticeship"] as const;
const LEVEL_OPTIONS = [2, 3, 4, 5, 6, 7] as const;

type EmployerSource = {
  id: string;
  employer_name: string;
  portal_url: string | null;
  portal_type: string | null;
  verified_level: string | null;
  notes: string | null;
  sector: string[] | null;
  last_verified_at: string | null;
};

type EmployerVacancyLead = {
  id: string;
  employer_source_id: string;
  role_title: string;
  apprenticeship_level: number | null;
  closing_date: string | null;
  start_date: string | null;
  apply_url: string | null;
  location: string | null;
  description: string | null;
  found_at: string;
};

type PossiblyClosedVacancy = {
  id: string;
  employer_name: string;
  role_title: string;
  closing_date: string | null;
  possibly_closed_at: string;
};

const inputClass = "rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/login");
  }

  const { data: employers } = await supabase
    .from("employer_sources")
    .select("id, employer_name, portal_url, portal_type, verified_level, notes, sector, last_verified_at")
    .order("employer_name")
    .returns<EmployerSource[]>();

  const { data: leads } = await supabase
    .from("employer_vacancy_leads")
    .select(
      "id, employer_source_id, role_title, apprenticeship_level, closing_date, start_date, apply_url, location, description, found_at"
    )
    .eq("status", "pending")
    .order("found_at", { ascending: false })
    .returns<EmployerVacancyLead[]>();

  const { data: possiblyClosed } = await supabase
    .from("vacancies")
    .select("id, employer_name, role_title, closing_date, possibly_closed_at")
    .not("possibly_closed_at", "is", null)
    .order("possibly_closed_at", { ascending: false })
    .returns<PossiblyClosedVacancy[]>();

  const employersById = new Map((employers ?? []).map((e) => [e.id, e]));

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-10">
      <div>
        <h1 className="font-heading text-2xl font-bold">Admin</h1>
        <p className="text-sm text-muted-foreground">employer_sources and curated vacancies.</p>
      </div>

      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
      {success && <p className="text-sm font-semibold text-[var(--warm-sage-foreground)]">{success}</p>}

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-bold">Employers ({employers?.length ?? 0})</h2>
        <div className="flex flex-col gap-3">
          {(employers ?? []).map((employer) => (
            <form
              key={employer.id}
              className="grid grid-cols-1 gap-2 rounded border p-3 text-sm sm:grid-cols-2"
            >
              <input type="hidden" name="id" value={employer.id} />
              <label className="flex flex-col gap-1">
                Name
                <input
                  name="employer_name"
                  defaultValue={employer.employer_name}
                  required
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1">
                Portal type
                <select
                  name="portal_type"
                  defaultValue={employer.portal_type ?? ""}
                  className={inputClass}
                >
                  <option value="">—</option>
                  {PORTAL_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                Portal URL
                <input
                  name="portal_url"
                  type="url"
                  defaultValue={employer.portal_url ?? ""}
                  placeholder="https://…"
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1">
                Verified level
                <input
                  name="verified_level"
                  defaultValue={employer.verified_level ?? ""}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>
                  Last verified{" "}
                  {employer.last_verified_at && (
                    <span className="text-xs text-muted-foreground">
                      ({new Date(employer.last_verified_at).toLocaleDateString()})
                    </span>
                  )}
                </span>
              </label>
              <fieldset className="flex flex-col gap-1 sm:col-span-2">
                <legend>Sector</legend>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {SECTOR_OPTIONS.map((sector) => (
                    <label key={sector} className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        name="sector"
                        value={sector}
                        defaultChecked={employer.sector?.includes(sector)}
                      />
                      {sector}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="flex flex-col gap-1 sm:col-span-2">
                Notes
                <textarea
                  name="notes"
                  defaultValue={employer.notes ?? ""}
                  rows={2}
                  className={inputClass}
                />
              </label>
              <button
                type="submit"
                formAction={updateEmployerSource}
                className="self-start rounded-lg border border-border px-3.5 py-1.5 text-sm font-bold transition-transform hover:bg-accent active:translate-y-px sm:col-span-2"
              >
                Save
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t pt-6">
        <h2 className="font-heading text-lg font-bold">Add employer</h2>
        <form className="grid grid-cols-1 gap-2 rounded border p-3 text-sm sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            Name
            <input name="employer_name" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            Portal type
            <select name="portal_type" defaultValue="" className={inputClass}>
              <option value="">—</option>
              {PORTAL_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            Portal URL
            <input name="portal_url" type="url" placeholder="https://…" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            Verified level
            <input name="verified_level" className={inputClass} />
          </label>
          <fieldset className="flex flex-col gap-1 sm:col-span-2">
            <legend>Sector</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {SECTOR_OPTIONS.map((sector) => (
                <label key={sector} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="sector" value={sector} />
                  {sector}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1 sm:col-span-2">
            Notes
            <textarea name="notes" rows={2} className={inputClass} />
          </label>
          <button
            type="submit"
            formAction={addEmployerSource}
            className="self-start rounded-lg bg-primary px-3.5 py-1.5 text-sm font-bold text-primary-foreground shadow-[0_3px_0_var(--shadow-accent)] transition-transform active:translate-y-px sm:col-span-2"
          >
            Add employer
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3 border-t pt-6">
        <h2 className="font-heading text-lg font-bold">Vacancy leads ({leads?.length ?? 0})</h2>
        <p className="text-sm text-muted-foreground">
          Found automatically by the employer-vacancy checker (
          <code>/api/cron/check-employer-vacancies</code>). AI-extracted from a real page, but not
          yet verified by you — review each field before publishing.
        </p>
        <div className="flex flex-col gap-3">
          {(leads ?? []).map((lead) => {
            const employer = employersById.get(lead.employer_source_id);
            return (
              <form
                key={lead.id}
                className="grid grid-cols-1 gap-3 rounded border border-[var(--warm-sky-border)] bg-[var(--warm-sky)] p-3 text-sm sm:grid-cols-2"
              >
                <input type="hidden" name="lead_id" value={lead.id} />
                <input type="hidden" name="employer_name" value={employer?.employer_name ?? ""} />
                <div className="sm:col-span-2 text-xs text-muted-foreground">
                  {employer?.employer_name ?? "Unknown employer"} — found{" "}
                  {new Date(lead.found_at).toLocaleDateString()}
                </div>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  Role title
                  <input
                    name="role_title"
                    defaultValue={lead.role_title}
                    required
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Level
                  <select
                    name="apprenticeship_level"
                    required
                    defaultValue={lead.apprenticeship_level ?? ""}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      Choose…
                    </option>
                    {LEVEL_OPTIONS.map((l) => (
                      <option key={l} value={l}>
                        Level {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  Closing date
                  <input
                    name="closing_date"
                    type="date"
                    defaultValue={lead.closing_date ?? ""}
                    required
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Start date
                  <input
                    name="start_date"
                    type="date"
                    defaultValue={lead.start_date ?? ""}
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  Apply URL
                  <input
                    name="apply_url"
                    type="url"
                    defaultValue={lead.apply_url ?? ""}
                    required
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  Location
                  <input name="location" defaultValue={lead.location ?? ""} className={inputClass} />
                </label>
                <fieldset className="flex flex-col gap-1 sm:col-span-2">
                  <legend>Sector</legend>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {SECTOR_OPTIONS.map((sector) => (
                      <label key={sector} className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          name="sector"
                          value={sector}
                          defaultChecked={employer?.sector?.includes(sector)}
                        />
                        {sector}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  Description
                  <textarea
                    name="description"
                    defaultValue={lead.description ?? ""}
                    rows={3}
                    className={inputClass}
                  />
                </label>
                <div className="flex gap-2 sm:col-span-2">
                  <button
                    type="submit"
                    formAction={addCuratedVacancy}
                    className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-bold text-primary-foreground shadow-[0_3px_0_var(--shadow-accent)] transition-transform active:translate-y-px"
                  >
                    Publish
                  </button>
                  <button
                    type="submit"
                    formAction={dismissEmployerVacancyLead}
                    formNoValidate
                    className="rounded-lg border border-border px-3.5 py-1.5 text-sm font-bold transition-transform hover:bg-accent active:translate-y-px"
                  >
                    Dismiss
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t pt-6">
        <h2 className="font-heading text-lg font-bold">
          Possibly closed ({possiblyClosed?.length ?? 0})
        </h2>
        <p className="text-sm text-muted-foreground">
          A re-check&apos;s fresh search didn&apos;t find these still listed on the employer&apos;s
          own site — students already see a warning on these. Confirm one way or the other; this
          doesn&apos;t auto-resolve.
        </p>
        <div className="flex flex-col gap-2">
          {(possiblyClosed ?? []).map((vacancy) => (
            <div
              key={vacancy.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-destructive/30 bg-destructive/10 p-3 text-sm"
            >
              <div>
                <span className="font-bold">{vacancy.role_title}</span>
                <span className="text-muted-foreground"> — {vacancy.employer_name}</span>
                <div className="text-xs text-muted-foreground">
                  Flagged {new Date(vacancy.possibly_closed_at).toLocaleDateString()} · stored
                  closing date {vacancy.closing_date ?? "—"}
                </div>
              </div>
              <div className="flex gap-2">
                <form>
                  <input type="hidden" name="vacancy_id" value={vacancy.id} />
                  <button
                    type="submit"
                    formAction={confirmVacancyClosed}
                    className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-bold text-primary-foreground transition-transform active:translate-y-px"
                  >
                    Confirm closed
                  </button>
                </form>
                <form>
                  <input type="hidden" name="vacancy_id" value={vacancy.id} />
                  <button
                    type="submit"
                    formAction={markVacancyStillOpen}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition-transform hover:bg-accent active:translate-y-px"
                  >
                    Still open
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t pt-6">
        <h2 className="font-heading text-lg font-bold">Add curated vacancy</h2>
        <p className="text-sm text-muted-foreground">
          For employers who post directly rather than via the Find an Apprenticeship API
          — e.g. GCHQ once its window opens.
        </p>
        <form className="grid grid-cols-1 gap-3 rounded border p-3 text-sm sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            Employer
            <select name="employer_name" required className={inputClass}>
              <option value="">Choose…</option>
              {(employers ?? []).map((e) => (
                <option key={e.id} value={e.employer_name}>
                  {e.employer_name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Role title
            <input name="role_title" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            Level
            <select name="apprenticeship_level" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Choose…
              </option>
              {LEVEL_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  Level {l}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Closing date
            <input name="closing_date" type="date" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            Start date
            <input name="start_date" type="date" className={inputClass} />
            <span className="text-xs text-muted-foreground">
              Leave blank if not yet announced.
            </span>
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            Apply URL
            <input name="apply_url" type="url" required placeholder="https://…" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            Standard reference
            <input name="standard_reference" placeholder="e.g. ST0409" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            Location
            <input name="location" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            Postcode
            <input name="postcode" placeholder="for commute-distance matching" className={inputClass} />
          </label>
          <fieldset className="flex flex-col gap-1 sm:col-span-2">
            <legend>Sector</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {SECTOR_OPTIONS.map((sector) => (
                <label key={sector} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="sector" value={sector} />
                  {sector}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1 sm:col-span-2">
            Description
            <textarea name="description" rows={3} className={inputClass} />
          </label>
          <button
            type="submit"
            formAction={addCuratedVacancy}
            className="self-start rounded-lg bg-primary px-3.5 py-1.5 text-sm font-bold text-primary-foreground shadow-[0_3px_0_var(--shadow-accent)] transition-transform active:translate-y-px sm:col-span-2"
          >
            Add curated vacancy
          </button>
        </form>
      </section>
    </main>
  );
}
