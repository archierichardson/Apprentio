"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMMUTE_OPTIONS, LEVEL_OPTIONS } from "@/app/onboarding/constants";
import { DISCOVERY_SECTOR_OPTIONS } from "@/lib/vacancies/discovery-sectors";

const CLOSING_WITHIN_OPTIONS = [
  { value: "7", label: "Next 7 days" },
  { value: "30", label: "Next 30 days" },
  { value: "90", label: "Next 90 days" },
];

// Apprenticeship start dates run near-term -- this year plus a few ahead
// covers every real case seen so far without hardcoding a list that goes
// stale.
const START_YEAR_OPTIONS = (() => {
  const currentYear = new Date().getFullYear();
  return [currentYear, currentYear + 1, currentYear + 2, currentYear + 3];
})();

const ANY = "any";

export function DiscoveryFilters({
  activeRoutes,
  activeLevel,
  activeCommute,
  activeClosingWithin,
  activeStartYear,
  resultCount,
}: {
  activeRoutes: string[];
  activeLevel: number | null;
  activeCommute: number | null;
  activeClosingWithin: string | null;
  activeStartYear: string | null;
  resultCount: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Every filter click is a real server round-trip (Discovery re-runs the
  // full matching/scoring pipeline) -- wrapping the navigation in a
  // transition means the button's pressed state updates instantly instead
  // of the whole panel just sitting there looking unresponsive until the
  // network call resolves.
  const [isPending, startTransition] = useTransition();

  // Setting a param to the literal "any" (rather than deleting it) records
  // that the user explicitly cleared this filter -- distinct from the param
  // being absent, which falls back to the profile's own default. Without
  // that distinction, picking "Any level" on a profile with a minimum level
  // set would just snap straight back to the profile's value.
  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => {
      router.push(`/discovery?${params.toString()}`, { scroll: false });
    });
  }

  function toggleSector(route: string) {
    const next = activeRoutes.includes(route)
      ? activeRoutes.filter((r) => r !== route)
      : [...activeRoutes, route];
    const params = new URLSearchParams(searchParams.toString());
    params.set("sectors", next.join(","));
    startTransition(() => {
      router.push(`/discovery?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-[20px_18px_21px_19px] border bg-card p-3.5 shadow-[0_16px_30px_-26px_rgba(96,74,52,0.5)] transition-opacity data-[pending=true]:opacity-60"
      data-pending={isPending}
    >
      <div className="flex flex-wrap gap-1.5">
        {DISCOVERY_SECTOR_OPTIONS.map(({ label, route }) => {
          const active = activeRoutes.includes(route);
          return (
            <Button
              key={route}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => toggleSector(route)}
              className="h-7 rounded-full px-3 text-xs"
            >
              {label}
            </Button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Minimum level</Label>
          <Select
            value={activeLevel != null ? String(activeLevel) : ANY}
            onValueChange={(value) => updateParam("level", value)}
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any level</SelectItem>
              {LEVEL_OPTIONS.map((level) => (
                <SelectItem key={level.value} value={String(level.value)}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Commute radius</Label>
          <Select
            value={activeCommute != null ? String(activeCommute) : ANY}
            onValueChange={(value) => updateParam("commute", value)}
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any distance</SelectItem>
              {COMMUTE_OPTIONS.map((minutes) => (
                <SelectItem key={minutes} value={String(minutes)}>
                  Within {minutes} min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Closing</Label>
          <Select
            value={activeClosingWithin ?? ANY}
            onValueChange={(value) => updateParam("closing_within", value)}
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any time</SelectItem>
              {CLOSING_WITHIN_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Start year</Label>
          <Select
            value={activeStartYear ?? ANY}
            onValueChange={(value) => updateParam("start_year", value === ANY ? null : value)}
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any year</SelectItem>
              {START_YEAR_OPTIONS.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(activeLevel != null ||
          activeCommute != null ||
          activeClosingWithin != null ||
          activeStartYear != null) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => startTransition(() => router.push("/discovery", { scroll: false }))}
          >
            Clear filters
          </Button>
        )}

        <span className="ml-auto self-center text-[13.5px] font-bold text-muted-foreground/70">
          {resultCount} match{resultCount === 1 ? "" : "es"}
        </span>
      </div>
    </div>
  );
}
