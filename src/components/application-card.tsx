"use client";

import { useState } from "react";
import { ArrowUpRight, CheckCircle2, Circle } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DraftSubmitButton } from "@/app/(app)/applications/DraftSubmitButton";
import { InterviewPrepDialog } from "@/components/interview-prep-dialog";
import { generateInterviewPrepQuestions } from "@/app/(app)/applications/interview-prep-actions";
import { INTERVIEW_PREP_STAGES } from "@/lib/interview-prep/constants";
import { isGovernmentEmployer } from "@/lib/interview-prep/government";
import { computeReadiness } from "@/lib/applications/readiness";

type ApplicationRow = {
  id: string;
  stage: string;
  drafted_cv: string | null;
  drafted_cover_letter: string | null;
  draft_notes: string | null;
  reflection_note: string | null;
  approved_at: string | null;
  submitted_at: string | null;
  vacancy_id: string | null;
  manual_employer_name: string | null;
  manual_role_title: string | null;
  manual_apply_url: string | null;
  manual_closing_date: string | null;
  vacancies: {
    employer_name: string;
    role_title: string;
    apply_url: string | null;
    closing_date: string | null;
    possibly_closed_at: string | null;
  } | null;
};

const STAGE_BADGE_VARIANT: Record<string, "outline" | "default" | "secondary"> = {
  saved: "outline",
  drafting: "outline",
  ready_for_review: "default",
  approved: "secondary",
  submitted: "secondary",
};

function ReadinessIndicator({ readiness }: { readiness: ReturnType<typeof computeReadiness> }) {
  if (readiness.total === 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div className="flex w-fit cursor-default items-center gap-1.5 text-xs text-muted-foreground" />
        }
      >
        <span className="flex items-center gap-0.5">
          {readiness.steps.map((step) =>
            step.done ? (
              <CheckCircle2 key={step.key} className="size-3.5 text-primary" />
            ) : (
              <Circle key={step.key} className="size-3.5 text-muted-foreground/35" />
            )
          )}
        </span>
        <span>
          {readiness.completed}/{readiness.total} ready
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <ul className="flex flex-col gap-0.5">
          {readiness.steps.map((step) => (
            <li key={step.key}>
              {step.done ? "✓" : "○"} {step.label}
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

// Optional and private -- collapsed behind "Add a note" until either the
// student opens it or a note already exists (so a previously-saved note is
// never hidden behind an extra click). Re-submitting the same form after
// editing is how "editable afterward" works: no separate edit mode, the
// textarea is always the live editable value.
function ReflectionNote({
  applicationId,
  initialNote,
  saveReflectionNote,
}: {
  applicationId: string;
  initialNote: string | null;
  saveReflectionNote: (formData: FormData) => void;
}) {
  const [expanded, setExpanded] = useState(Boolean(initialNote));

  if (!expanded) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(true)}
        className="self-start text-xs"
      >
        Add a note
      </Button>
    );
  }

  return (
    <form action={saveReflectionNote} className="flex flex-col gap-1.5 border-t pt-3">
      <input type="hidden" name="application_id" value={applicationId} />
      <Label
        htmlFor={`reflection-${applicationId}`}
        className="text-xs uppercase text-muted-foreground"
      >
        Private note (optional)
      </Label>
      <Textarea
        id={`reflection-${applicationId}`}
        name="reflection_note"
        defaultValue={initialNote ?? ""}
        rows={3}
        placeholder="What might you do differently next time?"
        className="text-sm"
      />
      <Button type="submit" variant="outline" size="sm" className="self-start">
        Save note
      </Button>
    </form>
  );
}

export function ApplicationCard({
  application,
  canDraft,
  hasBaseDocuments,
  hasPracticeAttempt,
  isPremium,
  freeDraftsRemaining,
  draftApplication,
  editDraft,
  approveApplication,
  rejectApplication,
  markSubmitted,
  markManualSubmitted,
  saveReflectionNote,
}: {
  application: ApplicationRow;
  canDraft: boolean;
  hasBaseDocuments: boolean;
  hasPracticeAttempt: boolean;
  isPremium: boolean;
  freeDraftsRemaining: number;
  draftApplication: (formData: FormData) => void;
  editDraft: (formData: FormData) => void;
  approveApplication: (formData: FormData) => void;
  rejectApplication: (formData: FormData) => void;
  markSubmitted: (formData: FormData) => void;
  markManualSubmitted: (formData: FormData) => void;
  saveReflectionNote: (formData: FormData) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const isManual = !application.vacancies;
  const readiness = computeReadiness({
    isManual,
    hasBaseDocuments,
    isApproved: Boolean(application.approved_at),
    isSubmitted: Boolean(application.submitted_at),
    interviewPrepAvailable: INTERVIEW_PREP_STAGES.includes(
      application.stage as (typeof INTERVIEW_PREP_STAGES)[number]
    ),
    hasPracticeAttempt,
  });
  const vacancy = {
    role_title:
      application.vacancies?.role_title ?? application.manual_role_title ?? "Untitled role",
    employer_name:
      application.vacancies?.employer_name ?? application.manual_employer_name ?? "Unknown employer",
    apply_url: application.vacancies?.apply_url ?? application.manual_apply_url,
    closing_date: application.vacancies?.closing_date ?? application.manual_closing_date,
    // Only real (synced/curated) vacancies get re-checked -- a manually
    // added application has nothing for the checker to compare against.
    possiblyClosedAt: application.vacancies?.possibly_closed_at ?? null,
  };

  return (
    <Card id={`application-${application.id}`} className="scroll-mt-4">
      <CardHeader>
        <CardTitle>{vacancy.role_title}</CardTitle>
        <CardDescription>{vacancy.employer_name}</CardDescription>
        <ReadinessIndicator readiness={readiness} />
        <CardAction>
          <Badge variant={STAGE_BADGE_VARIANT[application.stage] ?? "outline"}>
            {application.stage.replaceAll("_", " ")}
          </Badge>
        </CardAction>
      </CardHeader>

      {vacancy.possiblyClosedAt && (
        <CardContent className="pt-0">
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            This role may have closed early on the employer&apos;s own site — we&apos;re
            re-checking. Worth confirming directly before relying on it.
          </p>
        </CardContent>
      )}

      <CardContent className="flex flex-col gap-3 text-sm">
        {application.stage === "saved" && (
          <>
            {application.draft_notes && (
              <p className="text-muted-foreground">
                Last draft rejected: {application.draft_notes}
              </p>
            )}
            {isManual && (
              <>
                <p className="text-sm text-muted-foreground">
                  AI drafting isn&apos;t available for manually-added applications —
                  Apprentio doesn&apos;t have the listing details it needs to tailor a
                  draft. You can still track this application through every stage below.
                </p>
                <form className="self-start">
                  <input type="hidden" name="application_id" value={application.id} />
                  <Button type="submit" formAction={markManualSubmitted} variant="outline">
                    Mark as submitted
                  </Button>
                </form>
              </>
            )}
            {!isManual && !canDraft && (
              <Button
                type="button"
                disabled
                variant="outline"
                title="Upgrade to premium to unlock unlimited AI drafting"
                className="self-start"
              >
                Upgrade to draft a tailored CV & cover letter
              </Button>
            )}
            {!isManual && canDraft && !hasBaseDocuments && (
              <p className="text-destructive">
                Upload your base CV and cover letter in your profile before drafting.
              </p>
            )}
            {!isManual && canDraft && hasBaseDocuments && (
              <div className="flex flex-col gap-1">
                <form action={draftApplication}>
                  <input type="hidden" name="application_id" value={application.id} />
                  <DraftSubmitButton />
                </form>
                {!isPremium && (
                  <p className="text-xs text-muted-foreground">
                    {freeDraftsRemaining} free draft
                    {freeDraftsRemaining === 1 ? "" : "s"} remaining
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {application.stage === "ready_for_review" && (
          <>
            <p className="text-muted-foreground">
              A tailored CV and cover letter are ready for your review.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger render={<Button />}>Review draft</DialogTrigger>
                <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{vacancy.role_title}</DialogTitle>
                    <DialogDescription>
                      Edit the tailored draft below, then save your edits or approve it as-is.
                    </DialogDescription>
                  </DialogHeader>
                  <form action={editDraft} className="flex min-h-0 flex-1 flex-col gap-4">
                    <input type="hidden" name="application_id" value={application.id} />
                    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`cv-${application.id}`}>Tailored CV</Label>
                        <Textarea
                          id={`cv-${application.id}`}
                          name="drafted_cv"
                          defaultValue={application.drafted_cv ?? ""}
                          rows={10}
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`cover-${application.id}`}>Tailored cover letter</Label>
                        <Textarea
                          id={`cover-${application.id}`}
                          name="drafted_cover_letter"
                          defaultValue={application.drafted_cover_letter ?? ""}
                          rows={10}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" formAction={editDraft} variant="outline">
                        Save edit
                      </Button>
                      <Button type="submit" formAction={approveApplication}>
                        Approve
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <form className="flex flex-col gap-1.5 border-t pt-3">
              <input type="hidden" name="application_id" value={application.id} />
              <Label htmlFor={`reason-${application.id}`} className="text-xs uppercase text-muted-foreground">
                Reject — reason (required)
              </Label>
              <div className="flex gap-2">
                <Input
                  id={`reason-${application.id}`}
                  name="reason"
                  required
                  placeholder="e.g. tone is off, missing my NEA project"
                  className="flex-1"
                />
                <Button
                  type="submit"
                  formAction={rejectApplication}
                  variant="outline"
                  className="text-destructive"
                >
                  Reject
                </Button>
              </div>
            </form>
          </>
        )}

        {application.stage === "approved" && (
          <>
            <p className="text-xs text-muted-foreground">
              Approved{" "}
              {application.approved_at && new Date(application.approved_at).toLocaleString()}
            </p>
            <Dialog open={viewOpen} onOpenChange={setViewOpen}>
              <DialogTrigger render={<Button variant="outline" className="self-start" />}>
                View final documents
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{vacancy.role_title}</DialogTitle>
                  <DialogDescription>The approved, final version of your draft.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs uppercase text-muted-foreground">Final CV</Label>
                    <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/50 p-3 text-xs">
                      {application.drafted_cv}
                    </pre>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs uppercase text-muted-foreground">
                      Final cover letter
                    </Label>
                    <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/50 p-3 text-xs">
                      {application.drafted_cover_letter}
                    </pre>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {vacancy.apply_url && (
              <a
                href={vacancy.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Apply directly on the employer/Find an Apprenticeship page
                <ArrowUpRight className="size-3.5" />
              </a>
            )}
            <form>
              <input type="hidden" name="application_id" value={application.id} />
              <Button type="submit" formAction={markSubmitted} variant="outline" className="self-start">
                Mark as submitted
              </Button>
            </form>
          </>
        )}

        {application.stage === "submitted" && (
          <p className="text-muted-foreground">
            Submitted{" "}
            {application.submitted_at && new Date(application.submitted_at).toLocaleString()}
          </p>
        )}

        {application.stage === "rejected" && (
          <ReflectionNote
            applicationId={application.id}
            initialNote={application.reflection_note}
            saveReflectionNote={saveReflectionNote}
          />
        )}

        {INTERVIEW_PREP_STAGES.includes(
          application.stage as (typeof INTERVIEW_PREP_STAGES)[number]
        ) && (
          <InterviewPrepDialog
            applicationId={application.id}
            employerName={vacancy.employer_name}
            isGovernment={isGovernmentEmployer(vacancy.employer_name)}
            isPremium={isPremium}
            isManual={isManual}
            generateAction={generateInterviewPrepQuestions}
          />
        )}
      </CardContent>

      {(application.stage === "saved" || application.stage === "ready_for_review") &&
        vacancy.apply_url && (
          <CardFooter>
            <a
              href={vacancy.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              {isManual ? "View listing" : "View on Find an Apprenticeship"}
              <ArrowUpRight className="size-3.5" />
            </a>
          </CardFooter>
        )}
    </Card>
  );
}
