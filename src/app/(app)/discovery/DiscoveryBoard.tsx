"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VacancyDetailContent } from "@/components/vacancy-detail-content";
import { useDesktopSplitPane } from "@/hooks/use-desktop-split-pane";
import type { VacancyDetail } from "@/lib/vacancies/detail";
import type { EmployerResearch } from "@/lib/drafting/employer-research";
import type { MatchResult } from "@/lib/matching/match-score";
import {
  GRADE_MATCH_BADGE_VARIANT,
  type PersonalizedGradeMatch,
  type StudentGradeProfile,
} from "@/lib/vacancies/grade-match";

export type VacancyMatch = {
  id: string;
  employer_name: string;
  role_title: string;
  apprenticeship_level: number | null;
  location: string | null;
  postcode: string | null;
  closing_date: string | null;
  start_date: string | null;
  possibly_closed_at: string | null;
  distanceMiles: number;
  gradeSignal: string | null;
  personalizedGrade: PersonalizedGradeMatch | null;
  matchScore: MatchResult | null;
};

type VacancyDetailResult = {
  vacancy: VacancyDetail;
  isSaved: boolean;
  employerResearch: EmployerResearch | null;
  matchScore: MatchResult | null;
  hasCv: boolean;
  showUpgradeNudge: boolean;
};

export function DiscoveryBoard({
  matches,
  savedIds,
  saveVacancy,
  getVacancyDetail,
  studentGrades,
}: {
  matches: VacancyMatch[];
  savedIds: string[];
  saveVacancy: (formData: FormData) => void | Promise<void>;
  getVacancyDetail: (id: string) => Promise<VacancyDetailResult | null>;
  studentGrades: StudentGradeProfile;
}) {
  const isDesktop = useDesktopSplitPane();
  const savedSet = new Set(savedIds);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<VacancyDetailResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // A filter change can drop the selected vacancy from the visible list --
  // derived during render (not an effect) so a stale selection never
  // flashes before being cleared: it just never renders in the first place.
  const effectiveSelectedId =
    selectedId && matches.some((m) => m.id === selectedId) ? selectedId : null;

  function handleSelect(id: string) {
    setSelectedId(id);
    setSelectedResult(null);
    startTransition(async () => {
      const result = await getVacancyDetail(id);
      setSelectedResult(result);
    });
  }

  return (
    <div className="lg:grid lg:grid-cols-[380px_1fr] lg:items-start lg:gap-6">
      <ul className="flex flex-col gap-2">
        {matches.map((vacancy) => {
          const isSaved = savedSet.has(vacancy.id);
          const isActive = isDesktop && effectiveSelectedId === vacancy.id;
          return (
            <li key={vacancy.id} className="relative">
              <Link
                href={`/vacancies/${vacancy.id}`}
                onClick={(e) => {
                  if (!isDesktop) return;
                  e.preventDefault();
                  handleSelect(vacancy.id);
                }}
                className={`block rounded-2xl border p-3.5 pr-20 text-sm shadow-[0_12px_22px_-18px_rgba(96,74,52,0.5)] transition-all hover:-translate-y-0.5 ${
                  isActive
                    ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <p className="truncate pr-1 font-medium leading-snug">{vacancy.role_title}</p>
                <p className="truncate text-xs text-muted-foreground">{vacancy.employer_name}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="default">{vacancy.distanceMiles.toFixed(1)} mi</Badge>
                  <Badge variant="outline">Level {vacancy.apprenticeship_level ?? "—"}</Badge>
                  <Badge variant="outline">Closes {vacancy.closing_date ?? "—"}</Badge>
                  {vacancy.possibly_closed_at && (
                    <Badge variant="destructive">May have closed — re-checking</Badge>
                  )}
                  {vacancy.gradeSignal && <Badge variant="secondary">{vacancy.gradeSignal}</Badge>}
                  {vacancy.personalizedGrade && (
                    <Badge variant={GRADE_MATCH_BADGE_VARIANT[vacancy.personalizedGrade.status]}>
                      {vacancy.personalizedGrade.label}
                    </Badge>
                  )}
                  {vacancy.matchScore && (
                    <Badge variant={vacancy.matchScore.percent >= 50 ? "default" : "secondary"}>
                      {vacancy.matchScore.label} · {vacancy.matchScore.percent}%
                    </Badge>
                  )}
                </div>
              </Link>
              <form className="absolute right-3 top-3">
                <input type="hidden" name="vacancy_id" value={vacancy.id} />
                <Button
                  type="submit"
                  formAction={saveVacancy}
                  disabled={isSaved}
                  size="sm"
                  variant={isSaved ? "outline" : "default"}
                  className="h-7 px-2.5 text-xs"
                >
                  {isSaved ? "✓ Saved" : "Save"}
                </Button>
              </form>
            </li>
          );
        })}
      </ul>

      {isDesktop && (
        <div className="sticky top-[4.5rem] hidden max-h-[calc(100vh-6rem)] overflow-y-auto rounded-[24px_20px_26px_22px] border bg-card p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_30px_50px_-30px_rgba(96,74,52,0.5)] lg:block">
          {!effectiveSelectedId && (
            <p className="text-sm text-muted-foreground">
              Select a vacancy from the list to see full details here.
            </p>
          )}
          {effectiveSelectedId && isPending && !selectedResult && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {effectiveSelectedId && selectedResult && (
            <VacancyDetailContent
              vacancy={selectedResult.vacancy}
              isSaved={selectedResult.isSaved}
              employerResearch={selectedResult.employerResearch}
              matchScore={selectedResult.matchScore}
              hasCv={selectedResult.hasCv}
              showUpgradeNudge={selectedResult.showUpgradeNudge}
              studentGrades={studentGrades}
              saveAction={async (formData) => {
                await saveVacancy(formData);
                setSelectedResult((prev) => (prev ? { ...prev, isSaved: true } : prev));
              }}
            />
          )}
          {effectiveSelectedId && !isPending && !selectedResult && (
            <p className="text-sm text-destructive">Couldn&apos;t load this vacancy.</p>
          )}
        </div>
      )}
    </div>
  );
}
