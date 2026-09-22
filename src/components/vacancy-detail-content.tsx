import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { stripHtml } from "@/lib/vacancies/format";
import type { FaaVacancy } from "@/lib/vacancies/faa-client";
import { parseGradeEligibilitySignal } from "@/lib/vacancies/grade-signal";
import {
  personalizeGradeSignal,
  GRADE_MATCH_BADGE_VARIANT,
  type StudentGradeProfile,
} from "@/lib/vacancies/grade-match";
import type { MatchResult } from "@/lib/matching/match-score";
import type { VacancyDetail } from "@/lib/vacancies/detail";
import type { EmployerResearch } from "@/lib/drafting/employer-research";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="mt-2 text-sm leading-relaxed text-foreground/80">{children}</div>
    </div>
  );
}

export function VacancyDetailContent({
  vacancy,
  isSaved,
  saveAction,
  employerResearch,
  matchScore,
  hasCv,
  showUpgradeNudge,
  studentGrades,
}: {
  vacancy: VacancyDetail;
  isSaved: boolean;
  saveAction: (formData: FormData) => void | Promise<void>;
  employerResearch?: EmployerResearch | null;
  matchScore: MatchResult | null;
  hasCv: boolean;
  showUpgradeNudge: boolean;
  studentGrades: StudentGradeProfile;
}) {
  const faa = vacancy.source === "gov_api" ? (vacancy.raw_json as FaaVacancy) : null;
  const gradeSignal = faa ? parseGradeEligibilitySignal(faa.qualifications) : null;
  const personalizedGrade = faa ? personalizeGradeSignal(faa.qualifications, studentGrades) : null;

  const fullDescription = faa ? stripHtml(faa.fullDescription) || stripHtml(faa.description) : "";
  const employerDescription = faa ? stripHtml(faa.employerDescription) : "";
  const trainingDescription = faa ? stripHtml(faa.trainingDescription) : "";
  const outcomeDescription = faa ? stripHtml(faa.outcomeDescription) : "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">{vacancy.role_title}</h1>
          <p className="mt-1 text-base text-muted-foreground">{vacancy.employer_name}</p>
          <a
            href={`https://higherin.com/search-companies?search-term=${encodeURIComponent(vacancy.employer_name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs text-muted-foreground underline hover:text-foreground"
          >
            See employer reviews on Higherin ↗
          </a>
        </div>
        <form className="shrink-0">
          <input type="hidden" name="vacancy_id" value={vacancy.id} />
          <Button type="submit" formAction={saveAction} disabled={isSaved} variant={isSaved ? "outline" : "default"}>
            {isSaved ? "✓ Saved" : "Save"}
          </Button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="default">Level {vacancy.apprenticeship_level ?? "—"}</Badge>
        {vacancy.sector.map((sector) => (
          <Badge key={sector} variant="secondary">
            {sector}
          </Badge>
        ))}
        <Badge variant="outline">{vacancy.location ?? vacancy.postcode ?? "—"}</Badge>
        <Badge variant="outline">Closes {vacancy.closing_date ?? "—"}</Badge>
        <Badge variant="outline">
          {vacancy.start_date ? `Starts ${vacancy.start_date}` : "Start date not specified"}
        </Badge>
        {gradeSignal && <Badge variant="secondary">{gradeSignal}</Badge>}
        {personalizedGrade && (
          <Badge variant={GRADE_MATCH_BADGE_VARIANT[personalizedGrade.status]}>
            {personalizedGrade.label}
          </Badge>
        )}
      </div>

      {hasCv && matchScore && (
        <div className="rounded-2xl border border-[var(--warm-sage-border)] bg-[var(--warm-sage)]/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Match with your CV
            </h2>
            <Badge variant={matchScore.percent >= 50 ? "default" : "secondary"}>
              {matchScore.label} · {matchScore.percent}%
            </Badge>
          </div>
          {matchScore.matchedKeywords.length > 0 && (
            <p className="mt-2 text-sm text-foreground/80">
              Your CV mentions: {matchScore.matchedKeywords.join(", ")}
            </p>
          )}
          {showUpgradeNudge && (
            <p className="mt-3 text-xs text-muted-foreground">
              Save this vacancy, then upgrade to Premium for an AI-tailored CV & cover letter for
              this specific role.
            </p>
          )}
        </div>
      )}

      {!hasCv && (
        <div className="rounded-2xl border border-dashed p-4">
          <p className="text-sm text-muted-foreground">
            <Link href="/profile" className="underline">
              Upload your base CV
            </Link>{" "}
            to see how well you match this vacancy.
          </p>
        </div>
      )}

      {employerResearch?.found && (
        <div className="rounded-2xl border border-[var(--warm-sky-border)] bg-[var(--warm-sky)]/40 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            About this employer
          </h2>
          <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed text-foreground/80">
            {employerResearch.summary && <p>{employerResearch.summary}</p>}
            {employerResearch.values_culture && (
              <p>
                <span className="font-medium text-foreground">Values & culture: </span>
                {employerResearch.values_culture}
              </p>
            )}
            {employerResearch.notable_facts && (
              <p>
                <span className="font-medium text-foreground">Notable: </span>
                {employerResearch.notable_facts}
              </p>
            )}
            {employerResearch.source && (
              <p className="text-xs text-muted-foreground">
                Source:{" "}
                <a
                  href={employerResearch.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  {employerResearch.source}
                </a>
              </p>
            )}
          </div>
        </div>
      )}

      {faa && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-2xl border p-4 sm:grid-cols-3">
          {faa.wage?.wageAdditionalInformation && (
            <Fact label="Wage" value={faa.wage.wageAdditionalInformation} />
          )}
          {faa.hoursPerWeek != null && (
            <Fact label="Hours per week" value={String(faa.hoursPerWeek)} />
          )}
          {faa.expectedDuration && <Fact label="Duration" value={faa.expectedDuration} />}
          {faa.numberOfPositions != null && faa.numberOfPositions > 1 && (
            <Fact label="Positions available" value={String(faa.numberOfPositions)} />
          )}
          {faa.providerName && <Fact label="Training provider" value={faa.providerName} />}
          {faa.wage?.workingWeekDescription && (
            <Fact label="Working week" value={faa.wage.workingWeekDescription} />
          )}
        </dl>
      )}

      {fullDescription && (
        <Section title="Description">
          <p className="whitespace-pre-line">{fullDescription}</p>
        </Section>
      )}

      {!faa && vacancy.description && (
        <Section title="Description">
          <p className="whitespace-pre-line">{vacancy.description}</p>
        </Section>
      )}

      {employerDescription && (
        <Section title="About the employer">
          <p className="whitespace-pre-line">{employerDescription}</p>
        </Section>
      )}

      {trainingDescription && (
        <Section title="Training you'll receive">
          <p className="whitespace-pre-line">{trainingDescription}</p>
        </Section>
      )}

      {faa?.qualifications && faa.qualifications.length > 0 && (
        <Section title="Entry requirements">
          <ul className="flex flex-col gap-1">
            {faa.qualifications.map((q, i) => (
              <li key={i}>
                {[q.subject, q.qualificationType, q.grade && `grade ${q.grade}`, q.weighting]
                  .filter(Boolean)
                  .join(" — ")}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {faa?.skills && faa.skills.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-2">
            {faa.skills.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      {outcomeDescription && (
        <Section title="What happens next">
          <p className="whitespace-pre-line">{outcomeDescription}</p>
        </Section>
      )}

      {vacancy.possibly_closed_at && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <Badge variant="destructive">May have closed</Badge>
          <p className="text-sm text-destructive">
            A routine re-check couldn&apos;t find this listing on the employer&apos;s own site
            anymore. It may have closed early — we&apos;re re-checking, but confirm on the
            employer&apos;s site before relying on the apply link below.
          </p>
        </div>
      )}

      <div className="border-t pt-4">
        {/* apply_url is the specific job posting -- always preferred over
            employer_sources.portal_url (the employer's general careers
            page). Curated vacancies used to always show portal_url here
            regardless of apply_url, sending a student to the generic
            careers hub instead of the exact listing -- a real bug caught
            live (2026-09-21): Cisco's page showed "View on Cisco UK's
            site" linking to careers.cisco.com's apprenticeships hub, not
            the specific /apply?jobSeqNo=... URL upsertCuratedVacancy
            already requires and stores for every curated row. */}
        {vacancy.apply_url ? (
          <a
            href={vacancy.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            {vacancy.source === "gov_api" ? "View original listing ↗" : "Apply on this listing ↗"}
          </a>
        ) : (
          vacancy.employer_sources?.portal_url && (
            <a
              href={vacancy.employer_sources.portal_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground underline hover:text-foreground"
            >
              View on {vacancy.employer_name}&apos;s site ↗
            </a>
          )
        )}
      </div>
    </div>
  );
}
