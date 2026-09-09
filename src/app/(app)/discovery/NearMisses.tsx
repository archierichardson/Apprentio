"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { VacancyMatch } from "./DiscoveryBoard";

export type NearMissVacancy = VacancyMatch & {
  reasons: ("level" | "distance")[];
};

const REASON_LABEL: Record<NearMissVacancy["reasons"][number], string> = {
  level: "Below your level",
  distance: "Outside commute radius",
};

// Vacancies that match the student's sector but were excluded by their own
// level/commute defaults used to just vanish -- a student who'd seen the
// same role on another job board had no way to tell whether Apprentio had
// missed it or had deliberately filtered it out. Surfacing the count (and,
// expanded, the reason) makes that distinction visible instead of silent.
export function NearMisses({ vacancies }: { vacancies: NearMissVacancy[] }) {
  const [expanded, setExpanded] = useState(false);
  const levelCount = vacancies.filter((v) => v.reasons.includes("level")).length;
  const distanceCount = vacancies.filter((v) => v.reasons.includes("distance")).length;

  return (
    <div className="rounded-[18px_16px_19px_17px] border border-dashed bg-muted/30 p-3.5 text-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">
            {vacancies.length} more vacanc{vacancies.length === 1 ? "y" : "ies"}
          </span>{" "}
          match{vacancies.length === 1 ? "es" : ""} your sector but{" "}
          {levelCount > 0 && distanceCount > 0
            ? "are below your level or outside your commute radius"
            : levelCount > 0
              ? "are below your minimum level"
              : "are outside your commute radius"}
          .
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {expanded ? "Hide" : "Show"}
        </span>
      </button>

      {expanded && (
        <ul className="mt-3 flex flex-col gap-2">
          {vacancies.map((vacancy) => (
            <li
              key={vacancy.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-medium leading-snug">{vacancy.role_title}</p>
                <p className="truncate text-xs text-muted-foreground">{vacancy.employer_name}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                <Badge variant="outline">{vacancy.distanceMiles.toFixed(0)} mi</Badge>
                <Badge variant="outline">Level {vacancy.apprenticeship_level ?? "—"}</Badge>
                {vacancy.reasons.map((reason) => (
                  <Badge key={reason} variant="secondary">
                    {REASON_LABEL[reason]}
                  </Badge>
                ))}
              </div>
            </li>
          ))}
          <li>
            <Link href="/profile" className="text-xs underline text-muted-foreground">
              Adjust your level or commute radius
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
