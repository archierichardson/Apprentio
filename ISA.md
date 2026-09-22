---
project: Apprentio
effort: E3
phase: complete
progress: 34/34
mode: audit
started: 2026-09-02T10:54:03Z
updated: 2026-09-22T09:15:00Z
effort_source: context-override
---

## Problem

Archie wants to launch the beta today (self-imposed deadline, friends get free premium for a 2-week test period before wider rollout 2 weeks after that). Prior sessions already did a full MVP audit, a security pass, a UX/accessibility pass, a mobile audit, and a full UI redesign matched against reference mockups — TODO.md shows every item in those sections checked off. What's unverified is whether that checklist still reflects live reality today, and whether anything outside the checklist's scope (deploy freshness, external-service health, payment-mode readiness) blocks a real launch.

## Vision

Archie can hand the URL to a friend right now, that friend can sign up, receive a real confirmation email, complete onboarding, discover real vacancies, save one, and (if given the BETATESTER code) reach premium — all without hitting a single broken flow, silent failure, or stale deployment.

## Out of Scope

- Going live with real Stripe payments (business verification, bank details) — that's the public-rollout milestone 4 weeks out, not today's beta gate.
- Building anything from the Post-MVP/Brainstormed sections of TODO.md (interview-prep expansion, LinkedIn, apply-window calendar) — explicitly deferred, not launch-blocking.
- Re-running every security/UX fix already verified in prior sessions from scratch — instead, spot-check the highest-risk claims live and trust file evidence for the rest, per the classifier's E1→E3 context-override reasoning below.

## Principles

- Verify against the live system, not against what TODO.md claims — a checklist is only as good as its last real probe.
- Don't silently perform business/financial actions (switching Stripe to live mode) — flag and let Archie decide.
- Bias toward shipping today; only block on things that would actually break a beta tester's first session.

## Constraints

- bun/bunx only, TypeScript only, Next.js App Router on Vercel, Supabase (EU), Stripe, Resend — unchanged stack.
- Approval-gate / no-auto-submit / server-side subscription-gating rules from CLAUDE.md remain non-negotiable regardless of launch pressure.

## Goal

Confirm (with live tool evidence, not inspection alone) that a brand-new beta tester can complete signup → email confirmation → onboarding → discovery → save → premium-via-coupon end to end on the real `apprentio.app` production deployment today, and surface — not silently fix — anything that requires Archie's own decision (Stripe live mode).

## Criteria

- [x] ISC-1: Current git HEAD matches what's aliased at apprentio.app (`vercel inspect` shows the alias's deployment age ~1h, newer than the last two commits' push time)
- [x] ISC-2: `bun run lint` exits clean on current HEAD
- [x] ISC-3: `bun run build` exits clean on current HEAD
- [x] ISC-4: No uncommitted tracked-file changes in git status at audit start (only the recurring untracked `${HOME}/` hook artifact, not project work)
- [x] ISC-5: apprentio.app root returns HTTP 200
- [x] ISC-6: apprentio.app has valid TLS (curl -sI succeeds over https with no cert error)
- [x] ISC-7: CSP header present on apprentio.app response
- [x] ISC-8: X-Frame-Options: DENY present
- [x] ISC-9: X-Content-Type-Options: nosniff present
- [x] ISC-10: Referrer-Policy present
- [x] ISC-11: Strict-Transport-Security present
- [x] ISC-12: /login returns 200 signed-out
- [x] ISC-13: /signup returns 200 signed-out
- [x] ISC-14: /privacy returns 200 signed-out
- [x] ISC-15: /terms returns 200 signed-out
- [x] ISC-16: /dashboard redirects (307) signed-out rather than leaking authenticated content
- [x] ISC-17: Stripe webhook endpoint rejects an unsigned POST with 400, not 200
- [x] ISC-18: BETATESTER promotion code exists in Stripe and is active
- [x] ISC-19: BETATESTER max_redemptions/times_redeemed leaves real headroom (>0 remaining)
- [x] ISC-20: Resend domain mail.apprentio.app shows status "verified"
- [x] ISC-21: A real email has been sent through Resend with last_event "delivered" (not bounced/queued)
- [x] ISC-22: vacancies table has a row with a real created_at timestamp matching today's 02:00 UTC cron schedule
- [x] ISC-23: vacancies table total row count is materially larger than the last documented count (7,644 vs. 5,564 in TODO.md) — sync has kept running since that note
- [x] ISC-24: Stripe key mode (test/live) confirmed via grep, not assumed
- [x] ISC-25: TODO.md "Do first"/"Security"/"UX / accessibility"/"Mobile" sections contain zero unchecked `[ ]` items
- [x] ISC-26: A real signup on production apprentio.app (not localhost) reaches the "check your email" confirmation screen
- [x] ISC-27: Anti: the stray `${HOME}/` hook artifact must NOT be committed to the repo by this audit
- [x] ISC-28: The stray artifact is gitignored so a future session doesn't re-surface it as an untracked-file false alarm
- [x] ISC-29: Stripe live/test mode status is surfaced explicitly to Archie as a decision point, not silently changed
- [x] ISC-30: Final audit summary enumerates every TODO.md launch-relevant item's live status, not just a pass/fail verdict
- [x] ISC-31: Antecedent: Archie has an explicit, unambiguous answer to "can I send this to a friend right now" before this Algorithm run ends
- [x] ISC-32: No new code changes introduced without a corresponding lint+build re-check — no code fixes were needed this run
- [DEFERRED-VERIFY] ISC-33: N/A — no fix was needed this run, so nothing to commit/push beyond ISA.md and .gitignore. Follow-up: none required unless a future audit finds a real bug.
- [DEFERRED-VERIFY] ISC-34: N/A — no fix was needed this run, so no redeploy required. Follow-up: none required unless a future audit finds a real bug.

## Features

| name | description | satisfies | depends_on | parallelizable |
|---|---|---|---|---|
| Deploy/build health | Confirm git HEAD, lint, build, and production alias all agree | ISC-1..4 | — | yes |
| Security surface | Headers, webhook signature check, TODO.md checklist cross-read | ISC-7..17, 25 | Deploy/build health | yes |
| Beta-onboarding path | BETATESTER coupon existence, redemption headroom, lifecycle | ISC-18/19 | — | yes |
| Email pipeline | Resend domain verification + real delivered send + real signup click-through | ISC-20/21, 26 | Deploy/build health | no (real signup depends on a live deploy) |
| Data freshness | Vacancy-sync cron recency and row-count growth | ISC-22/23 | — | yes |
| RLS/authz depth (added post-advisor) | Supabase security linter + manual inspection of anon-exposed functions | new, folded into ISC-26's Verification entry | Deploy/build health | yes |
| Hygiene | Stray `${HOME}/` artifact removal + gitignore, test-account cleanup | ISC-27/28 | Email pipeline | yes |
| Reporting | TODO.md/ISA documentation of findings and forward action items | ISC-29/30 | all of the above | no |

## Test Strategy

| isc | type | check | threshold | tool |
|---|---|---|---|---|
| 1 | deploy | vercel inspect alias age vs git log timestamps | alias deployment ≥ latest push | Bash/vercel CLI |
| 2-3 | build | bun run lint / bun run build | exit 0 | Bash |
| 4 | git | git status --short | no unexpected tracked changes | Bash |
| 5-16 | http | curl -sI / -o /dev/null -w %{http_code} | documented status codes | Bash/curl |
| 17 | webhook | curl POST unsigned body | 400 | Bash/curl |
| 18-19 | stripe | GET /v1/promotion_codes | active:true, redemptions remaining | Bash/curl+Stripe API |
| 20-21 | resend | GET /domains, GET /emails | verified, last_event delivered | Bash/curl+Resend API |
| 22-23 | data | REST query on vacancies | fresh created_at, count growth | Bash/curl+Supabase REST |
| 24 | config | grep sk_test/sk_live in .env.local | reports actual mode | Bash/grep |
| 25 | doc | grep unchecked boxes in TODO.md sections | zero in launch-relevant sections | Bash/grep |
| 26 | e2e | real browser signup on apprentio.app | reaches check-email screen | claude-in-chrome |
| 27-28 | hygiene | git status / .gitignore contents | artifact absent from git add, present in gitignore | Bash |
| 29 | decision | surfaced in final summary text | explicit sentence naming test-mode status | manual/text |
| 30-31 | reporting | final summary content | itemized status list present | manual/text |
| 32-34 | process | conditional on any fix being made | lint/build/push/redeploy all run if triggered | Bash |

## Decisions

- 2026-09-20T00:00Z (new task cycle, E2): Archie asked to "ensure email notifications for the register-your-interest button actually work." Investigated before assuming a bug: `registerEmployerInterest` (discovery/actions.ts) only ever inserted a DB row — TODO.md's own 2026-09-04 entry had already flagged this as an explicit, un-silent follow-up ("Not built"), not a regression. Root cause of "doesn't work": the send path never existed. Built it — see Verification below — rather than debugging a live-but-broken sender that was never written.
- 2026-09-20T00:05Z: Delegation floor (soft, E2 ≥1) relaxed to 0. Show-your-math: single-repo, single-developer change with no independent workstream to parallelize — a delegated agent would re-read the same 4 files I already had open, adding a context-relay hop with no verification value.
- 2026-09-20T00:10Z: Offered a live end-to-end send (real Resend call, real inbox, throwaway DB rows) via AskUserQuestion; Archie chose code-level verification only for tonight. Live send deferred, not skipped — see Verification.
- 2026-09-20T20:30Z (new task cycle, E3, `/plan`): Archie compared Discovery against a competitor site and found real Digital/L6/2027 listings (Barclays, IBM, Cisco, L'Oréal) Apprentio had none of. Used Plan Mode per explicit instruction — investigated live (gov.uk FAA search, competitor page source/network, direct DB queries) before writing the plan, then ran one Plan sub-agent to validate a specific design point (which sector vocabulary `employer_sources.sector` should use) rather than re-exploring everything myself. Full plan at `Plans/tidy-plotting-sutton.md` (agenticos vault), approved verbatim via ExitPlanMode.
- 2026-09-20T20:45Z: Plan sub-agent corrected my draft design: `employer_sources.sector` must use `SECTOR_OPTIONS` (raw `sectors_of_interest` vocabulary), not `vacancies.sector`'s FAA-route vocabulary — the latter collapses distinct sectors (Cybersecurity and Government & Defence both → "Protective services"), which would silently leak employers across unrelated students' watch lists. Adopted verbatim; this is exactly the bug class the plan exists to fix, one table over.
- 2026-09-20T21:02Z: `bunx supabase db push` (schema migration + data backfill on the live production DB) was blocked by the auto-mode classifier on first attempt, correctly — genuinely high-blast-radius, shared-system action. Held it and continued with local-only code changes; re-ran after the user's explicit "finish this" following the approved plan and a clean local build, which I judged as sufficient authorization for exactly the steps the approved plan already named (not a blanket authorization for anything beyond it).
- 2026-09-20T21:15Z: L'Oréal's sector tag (`Software Engineering`) is a judgment call, not a confident match — flagged in the plan, in TODO.md, and here rather than silently picking one. Its real role (tech newsletter + translation-vendor coordination) doesn't cleanly fit any `SECTOR_OPTIONS` value.
- 2026-09-20T21:30Z: Backfilling the Barclays and Cisco UK vacancies triggered tonight's earlier email-notify-on-add feature for real (Archie's own dogfood account had live registrations against both) — two real emails sent, both registrations correctly cleared after. Surfaced explicitly rather than treated as an incidental log line, since it's the feature's first real-world firing.
- 2026-09-21T15:00Z (new task cycle, E3 despite classifier's E2 — same conversation-context-override reasoning as the prior task: an automated scraping/scheduling feature with real architectural forks isn't a single-domain E2): Asked for automated discovery, generalizing the manual competitor-comparison fix from the session before. Used Plan Mode again (overwrote the prior plan file — different task, not a continuation). Investigated Vercel's actual plan/limits live (`vercel teams ls` → Hobby; web search confirmed Hobby's 2-cron/60s-function caps) before designing, rather than assuming — this directly shaped the batch-of-2/cycles-over-a-week design, not an afterthought.
- 2026-09-21T15:05Z: Asked three real architecture questions via AskUserQuestion before finalizing the plan (where it runs: Pi vs Vercel vs Pro upgrade; publish gate: auto vs review queue; scope: tracked-only vs open-ended discovery) — each a genuine fork with real trade-offs. Archie picked the recommended option on all three (Vercel cron batched, review queue, tracked-only).
- 2026-09-21T15:40Z: `bunx supabase db push` failed 3 times with the same Postgres-pooler connection error; diagnosed with a raw `nc -zv` TCP test rather than assuming and retrying blindly — confirmed a genuine network-level block on port 5432 (REST/HTTPS to the same project worked fine throughout), not an auth or CLI issue. Stopped after diagnosis rather than reaching for a workaround (e.g. fetching/setting `SUPABASE_DB_PASSWORD`) — that's a credential action, and the suggestion doesn't address a port-level block anyway. Migration committed but left unapplied; surfaced to Archie as a real blocker, not silently worked around or declared done.
- 2026-09-21T17:41Z: Migration applied successfully once Archie confirmed he'd switched networks — retried the exact same command, worked first try, confirming the port-5432 diagnosis was correct.
- 2026-09-21T17:43Z: First live run of the new checker only checked 1 employer instead of the batch size of 2. Investigated rather than assumed a code bug: found 16 of 17 `employer_sources` rows had `portal_url: null`, when a REST dump from earlier the same session (before the sector migration work) showed all 16 with real values. Root-caused to `scripts/seed-employer-sources.ts`'s idempotency re-run the night before (2026-09-20T~22:24Z) — the script has always hardcoded `portal_url: null` on every upsert row; it just hadn't been re-run since the real URLs were set until that test. A real regression I introduced and didn't catch at the time (I verified `sector` survived that re-run but never re-checked `portal_url`).
- 2026-09-21T17:44Z: Restoring 13 rows via bulk PATCH was blocked by the auto-mode classifier (bulk production write) — asked Archie directly rather than finding a workaround, given this was fixing damage from my own earlier mistake, not routine work. Approved; restored from values still held verbatim in this session's own earlier tool output, not reconstructed from memory. Then fixed the script itself (removed `portal_url` from the upsert payload entirely) and re-ran it live as a regression test — confirmed all 13 stayed intact and the 3 genuinely-never-found employers stayed null.
- 2026-09-21T17:50Z: First real check (L'Oréal) returned 3 structurally-valid but substantively wrong leads (2025 start dates, third-party-aggregator sourced) — a real demonstration of exactly the failure mode the review-queue plan decision exists to catch, not a hypothetical risk. Didn't force-dismiss them (a second bulk-write classifier block, and more importantly: that's what the review queue and Archie's own judgment are for) — left pending, tightened the extraction prompt (explicit today's-date anchor, aggregator distrust, explicit past-start-date rejection) based on this concrete failure before calling the feature done.
- 2026-09-21T17:53Z: Two subsequent checks (BT Group, GCHQ, then Cisco UK, Civil Service) both hit the 50s per-check timeout. Read as expected variance within `researchViaWebSearch`'s own documented 40-90s range colliding with Hobby's 60s ceiling, not a new bug — confirmed the designed graceful-degradation path fired correctly (`last_checked_at` updated on both despite the timeout, route still returned 200) rather than assuming from the error message alone.
- 2026-09-21T18:50Z (new task cycle, E2 per classifier): Archie asked for three things at once — competitor-matched sector filter labels, a start-year picker, and faster filter buttons. Did not invoke Plan Mode this time, unlike the two prior tasks tonight — judgment call, not an oversight: the architecture forks here (cache geocode on the profile vs. a separate table, real FAA-route taxonomy vs. inventing new labels, hardcoded year range vs. querying distinct years) were each "obviously correct given the codebase's own existing patterns" rather than genuine multi-way trade-offs a user needs to weigh, unlike last time's Pi-vs-Vercel-vs-Pro or auto-publish-vs-review-queue questions. Reproduced the responsiveness complaint before touching anything (Gate A) rather than assuming a client-side/UI cause — measured a real 3.2s cold geocode call, confirmed profiles had zero lat/lng caching at all.
- 2026-09-21T19:00Z: Queried the real, live `vacancies.sector` values (14 of 15 in a 5000-row sample, then confirmed the 15th — "Protective services" — with a targeted containment query) rather than trusting `SECTOR_TO_FAA_ROUTES`'s own approximated target strings or guessing at the FAA's naming. Ground-truth data, not the existing mapping table, is what the new `DISCOVERY_SECTOR_OPTIONS` list is keyed against.
- 2026-09-21T19:02Z: Decoupled "Employers to watch" from the Discovery page's own sector filter (now keyed only on `profile.sectors_of_interest`) rather than preserving the prior coupling. Show-your-math: the two now speak genuinely different taxonomies (FAA routes vs. onboarding's SECTOR_OPTIONS, the latter being what `employer_sources.sector` actually uses per last night's work) — keeping them coupled would mean either translating one into the other again (reintroducing the exact lossy-mapping problem last night's employer_sources fix eliminated) or having the watch-list flicker based on which vacancy-sector buttons happen to be toggled, which was never really the intent. Not asked for explicitly, but a direct, unavoidable consequence of fixing the sector taxonomy properly.
- 2026-09-21T21:20Z (new task cycle, E5 per classifier): Archie reported not seeing any changes. Diagnosed rather than assumed: `git log origin/main..HEAD` showed 10 unpushed commits — every real code change from the whole session was sitting local-only, only the direct DB writes (migrations, data backfills) had ever reached production. Root cause of my own process gap: I'd been treating `git commit` as sufficient closure all session without checking it against what the user could actually see. Pushed after explicit confirmation (git push is a real, visible, shared-state action) and confirmed the new Vercel deployment actually serves apprentio.app before declaring it fixed.
- 2026-09-21T21:30Z: Asked to "test everything" — chose to log in as a real authenticated user rather than infer correctness from code/build success alone, consistent with the Verification Doctrine's Rule 1 (live-probe for user-facing artifacts) applied at its most literal. Couldn't get Archie's real password and judged resetting his real account's credentials to test with too intrusive; instead created a throwaway QA account via `admin.auth.admin.createUser` with a password I generated myself — same established pattern this project's own TODO.md history uses repeatedly ("created a real test account... deleted afterward"), not a new risk. `admin.auth.admin.generateLink` (a more direct route) was blocked by the classifier as a sensitive auth action — didn't attempt to route around it, used the real login-form UI instead.
- 2026-09-21T21:45Z: Live test surfaced 0 matches despite the 4 target vacancies genuinely existing with correct sector/level/closing_date. Didn't assume the sector-taxonomy or filter code was wrong (it had just been verified rendering correctly) — checked the vacancies' own data first and found `latitude`/`longitude` null on all 4, because Barclays/Cisco were backfilled without any `postcode` field at all and L'Oréal's postcode was a known-terminated one flagged (but under-stated) in an earlier session's TODO.md entry. Verified real, current postcodes via web search (not guessed) before writing them.
- 2026-09-21T21:50Z: The apply-link bug (curated vacancies showing `portal_url` instead of `apply_url`) was found by literally reading the rendered detail panel during the vacancies-showing-up test, not from a code review — the "View on Cisco UK's site" link went to Cisco's generic apprenticeships hub, not the specific `/apply?jobSeqNo=...` URL already stored. Traced to `vacancy-detail-content.tsx`'s curated-source branch, confirmed via `grep` that this affects every curated vacancy in the app (pre-existing, not introduced tonight).
- 2026-09-21T21:52Z: Most serious finding — `profiles.latitude`/`longitude` had no column-level `GRANT UPDATE` for `authenticated`, which this project uses deliberately instead of table-wide grants (established pattern, two prior identical-shaped fixes already in migration history: `20260806091337`, `20260813214208`). Didn't stop at "the self-heal write silently does nothing" — replicated the exact real-user update call standalone to get the actual Postgres error (`42501`) rather than guessing, which is what revealed this breaks the *entire* profile save atomically, not just the two new columns — a real regression in existing onboarding/profile-editing functionality for the ~3 hours between the columns migration and this fix, not merely an incomplete new feature.
- 2026-09-21T21:55Z: Anthropic API credits are exhausted in production (`400`, confirmed via the real `check-employer-vacancies` cron call, not assumed). Correctly out of scope to fix myself — a billing action only Archie can take — logged clearly as a blocking TODO item rather than silently leaving the checker looking "done" when it can't actually run right now.
- 2026-09-22T09:00Z (new task cycle, E2 per classifier): Archie reported a real drafting timeout. Went straight to the actual source of `researchViaWebSearch`'s timeout logic rather than guessing at causes -- found the code's own comment asserting Vercel's function limit was 300s, which contradicts what I'd confirmed live the night before (Hobby, 60s) for an unrelated feature. Treated the comment as a claim to verify, not a fact, given it directly contradicted something already independently confirmed in this same session.
- 2026-09-22T09:05Z: Didn't just widen the timeout number -- the real ceiling (60s) can't accommodate the documented worst-case research time (up to 90s) no matter what's configured, so the actual fix has to be "abandon slow research gracefully," not "wait longer." Reused the exact degradation the prompt already had a branch for (`found: false`) rather than inventing new fallback behavior.
- 2026-09-22T09:20Z: Verified with a full real pipeline -- new throwaway account, real uploaded CV/cover-letter text files, a real application row against the already-live Cisco vacancy, a real click on Draft -- rather than trusting typecheck/build alone, consistent with the live-probe bar applied to every other fix tonight. Confirmed both the speed (well under 20s) and the actual generated content (correctly named Cisco UK and referenced the specific role, not a generic fallback).
- 2026-09-02T10:58Z: PLAN phase skipped EnterPlanMode despite E3-Advanced+ guidance. Show-your-math: the user explicitly said "Get this done!" under an active /goal directive, the remaining EXECUTE step is one read-mostly live signup test (no schema/infra changes, fully reversible — a throwaway test account), and re-litigating with a plan-approval gate would contradict both the explicit instruction and this project's established "build over ask for reversible actions" preference. Proceeding directly to EXECUTE.
- 2026-09-02T10:54Z: Classifier returned MODE: ALGORITHM, TIER: E1, SOURCE: deterministic, REASON: "deterministic (blocking classifier disabled)". This is not one of the four documented `effort_source` values (explicit/classifier/context-override/auto) — it's a self-declared stub state where the real judgment isn't running. Per doctrine "bias higher when in doubt" and the fail-safe precedent (classifier errors default to E3), escalated to **E3** rather than executing a <90s pass on a full pre-launch, multi-domain audit request. Logged here per the context-override rule rather than silently overriding.
- 2026-09-02T10:56Z: Delegation floor (soft, E3 ≥2) relaxed to 0 delegated agents. Show-your-math: every verification this run needs (Stripe API, Resend API, Supabase REST, Vercel CLI, curl against production) requires credentials/context already held directly in this session; spawning an agent to re-issue the same curl commands adds a context-relay hop with zero verification value and burns the E3 <10min budget on ceremony rather than substance. Deliberate, not an oversight.
- 2026-09-02T11:06Z: A real signup to `richardson.archie+launchaudit0902c@yahoo.com` hard-bounced (SMTP 552 "mailbox not found"). Root-caused via Resend's bounce diagnostic, not assumed: Yahoo rejected the specific plus-tagged local part as a nonexistent mailbox — a recipient-side rejection, not a sending-pipeline defect. Confirmed by immediately repeating the identical signup flow against `archierichardson73+launchaudit0902d@gmail.com` through the exact same Supabase→Resend→SES pipeline seconds later, which came back `delivered`. Not treated as a launch blocker; not fixable on the sending side since the recipient's own mail server is what rejected it.
- 2026-09-02T11:06Z: The `Sign up` button did not reliably submit via ref-based or coordinate clicks on the first 2-3 attempts (no POST fired, no error shown) despite the page code being verified correct (`type="submit"` present, confirmed via grep of the actual source). Root-caused as browser-automation click-timing flakiness, not a product bug — the exact same click eventually fired a real `POST /signup` (confirmed in the network log) and produced two genuinely new Supabase auth users. Consistent with this project's already-documented pattern of tooling artifacts (CSP blocking Interceptor's eval-based introspection) rather than real regressions — verified by reading the deployed source directly rather than trusting the tool's silence.

## Verification

- ISC-1: `vercel inspect apprentio.app` — alias resolves to deployment `apprentio-27z773jfu` (age ~1h), which post-dates both audit-relevant commits (cab056f, ebc6d17); `vercel ls` confirms this is the current Production entry.
- ISC-2/3: `bun run lint` → clean (no output beyond the eslint invocation); `bun run build` → "Compiled successfully", TypeScript clean, all 23 routes generated.
- ISC-4: `git status --short` at audit start showed only the recurring untracked `${HOME}/` artifact, zero tracked-file changes.
- ISC-5/6: `curl -sI https://apprentio.app/` → 200 over a valid TLS session (curl would hard-fail on cert error).
- ISC-7-11: same `curl -sI` response headers included `content-security-policy`, `x-frame-options: DENY`, `x-content-type-options: nosniff`, `referrer-policy`, `strict-transport-security`, all present.
- ISC-12-16: `curl -o /dev/null -w %{http_code}` per path — /login 200, /signup 200, /privacy 200, /terms 200, /dashboard 307 (redirect, not a content leak).
- ISC-17: `curl -X POST /api/webhooks/stripe -d '{}'` → 400 (signature check rejects, as designed).
- ISC-18/19: Stripe API `GET /v1/promotion_codes?code=BETATESTER` → `active: true`, `times_redeemed: 1`, `max_redemptions: 25` (24 remaining).
- ISC-20/21: Resend API `GET /domains` → `mail.apprentio.app: verified`; `GET /emails` → a prior real send with `last_event: delivered`.
- ISC-22/23: Supabase REST `vacancies?order=created_at.desc&limit=1` → newest row `2026-09-02T02:13:09Z` (matches the `0 2 * * *` cron schedule, today); total count 7,644 vs. 5,564 documented in TODO.md — sync has kept running.
- ISC-24: `grep -o 'sk_test\|sk_live' .env.local` → `sk_test` (confirmed test mode, not assumed).
- ISC-25: `grep -n "^- \[ \]" TODO.md` → zero matches inside "Do first"/"Security"/"UX / accessibility"/"Mobile" sections; all unchecked items are in Post-MVP/Brainstormed (explicitly out of scope for today).
- ISC-26: Real browser signup on `https://apprentio.app/signup` → URL transitioned to `?checkEmail=1`, screenshot confirms the "Check your email" card rendered. Cross-checked against Resend: a real `Confirm your email address` send fired within the same minute, `delivered` to a real Gmail inbox.
- ISC-27/28: `git status --short` post-cleanup shows no `${HOME}/` entry; `.gitignore` now contains a `${HOME}/` line (tail -5 confirmed on disk).
- ISC-29: Surfaced in the closing summary to Archie as an explicit named decision point (Stripe test-mode vs. the 4-week-out public-paid milestone), not silently changed.
- ISC-30/31: Closing summary itemizes every checked subsystem with live evidence and ends on an explicit go/no-go statement for today's beta.
- ISC-32: No `src/` files were edited this run — only `.gitignore` and `ISA.md`, neither of which affects the app build; re-ran `bun run build` anyway after the .gitignore edit as a sanity check (clean).
- Two real test accounts created during ISC-26 verification (`+launchaudit0902c@yahoo.com`, `+launchaudit0902d@gmail.com`) were deleted via the Supabase Admin API afterward — confirmed `200` on both `DELETE` calls, and a follow-up listing query no longer shows either.
- **Post-advisor-call additions** (Rule 2 commitment-boundary advisor surfaced real gaps not in the original 34 ISCs):
  - RLS/authz: `bunx supabase db advisors --linked` (Supabase's own security linter) returned zero ERROR-level findings. Every user-data table (`profiles`, `subscriptions`, `applications`, `application_events`, `interview_practice_attempts`) has active `select_own`/`insert_own`/`update_own`/`delete_own` RLS policies — the linter's only complaint about them is a performance suggestion (wrap `auth.uid()` in `select` for query-plan caching), not a security gap. The advisor's specific worst-case fear (RLS off + permissive `true` policy) would surface as an ERROR-level `rls_disabled_in_public` finding, which is absent.
  - Anon-executable SECURITY DEFINER functions: inspected the two most sensitive by name directly (`handle_new_user`, `rls_auto_enable`) via `pg_proc.prosrc`. `handle_new_user` only references trigger-context `NEW`, which errors if called outside a trigger — not exploitable via RPC. `rls_auto_enable` turned out to be a Supabase **platform-provided** event-trigger function (owned by `postgres`, not present in any of our own migrations) that auto-enables RLS on any newly created public table — a safety net, not custom code with a gap.
  - Confirmation-link click-through: completed end-to-end on a fresh real signup (`+launchaudit0902f@gmail.com`) — fetched the actual magic-link URL from the Resend API, navigated to it directly, landed authenticated on `/onboarding` (correct redirect for a not-yet-onboarded user). Confirms Supabase's Site URL/Redirect URL config has not drifted from `apprentio.app`.
  - BETATESTER coupon behavior characterized via Stripe API: `duration: "repeating"`, `duration_in_months: 3`, `percent_off: 100`. Beta testers get 3 full months free — comfortably past the stated 4-week beta window — but will be charged automatically at month 4 unless they cancel first. Not a tonight-blocker; flagged to Archie as a decision needed before month 4 (cancel-and-recomp beta testers manually, or extend the coupon, before that boundary — especially relevant if Stripe has since flipped to live mode by then, since a stale saved card would then be charged for real).
  - Coupon-exhaustion UX (friend #26) and Sentry/error-monitoring were not empirically tested (former is destructive — would burn real redemption slots; latter is genuinely absent) — surfaced as recommendations in the closing summary, not built this run, consistent with the Out of Scope framing (today's gate is the beta launch, not a general hardening pass).
  - Privacy notice / minimum age / account-deletion path: NOT re-verified this run via new probes — already read directly (not from TODO.md claims) earlier in this session: `src/app/privacy/page.tsx` has a "Sixth-formers and age" section, `src/app/(app)/account/delete/page.tsx` implements a real typed-confirmation deletion flow, and TODO.md's "Test account deletion end-to-end" entry (from a prior session) verified live cascade deletion including Storage cleanup. Citing prior direct file reads as evidence, not the checkmark alone.

- **2026-09-20 task — watched-employer notification email:**
  - ISC-N1: New `src/lib/email/resend.ts` (`sendEmail`) exists and exports a typed `ok`/`error` result. — `Read` confirms file content matches intent.
  - ISC-N2: `sendEmail` calls the real Resend HTTP API (no unused SDK dependency added). — `grep -n "\"resend\""` package.json → no match; `resend.ts` uses `fetch("https://api.resend.com/emails")`.
  - ISC-N3: New `src/lib/notifications/vacancy-watch-alert.ts` (`notifyEmployerWatchers`) looks up `employer_interest_registrations` by `employer_source_id`. — `Read` confirms the `.eq("employer_source_id", ...)` query.
  - ISC-N4: Registrant email resolved via `admin.auth.admin.getUserById`, not a nonexistent `profiles.email` column. — confirmed `profiles` schema (initial_schema.sql) has no `email` column; `getUserById` used instead.
  - ISC-N5: Anti — a failed email send must not roll back the already-committed vacancy upsert. — `curated.ts` calls `notifyEmployerWatchers` *after* the upsert's error check returns; notify errors are pushed to `warnings`, function still returns `ok: true`.
  - ISC-N6: Anti — a registrant must not be emailed twice for the same employer's vacancy going live. — registration row is deleted immediately after a successful send inside the same loop iteration.
  - ISC-N7: `upsertCuratedVacancy` now returns the real inserted/updated vacancy `id` for the email link. — `.select("id").single()` added to the upsert call; `Read` confirms.
  - ISC-N8: Both real call sites (admin form, CLI script) pass the service-role admin client, satisfying the RLS-bypass this needs. — `grep -n "createAdminClient"` on both `admin/actions.ts` and `scripts/add-curated-vacancy.ts` confirms.
  - ISC-N9: `tsc --noEmit -p tsconfig.json` clean after wiring. — ran, "No errors found", exit 0.
  - ISC-N10: `eslint` clean on all 3 touched/new files. — ran, "No issues found", exit 0.
  - ISC-N11: [DEFERRED-VERIFY] Live end-to-end send (real Resend call reaching a real inbox). — declined for tonight by explicit user choice (AskUserQuestion); follow-up: Archie adds a real curated vacancy for a genuinely-watched employer via the admin UI and confirms the email arrives, then checks off the TODO.md item.
  - Coverage: 10/11 tool-verified this run, 1 deferred with a named follow-up (TODO.md line, same file).

- **2026-09-20 task — sector-general employer coverage (competitor-gap fix):**
  - ISC-M1: `employer_sources.sector` column exists on the live DB. — `bunx supabase db push` (non-dry-run) applied migration `20260920190236_employer_sources_sector.sql`; direct REST query confirms `sector` present on all 16 pre-existing rows.
  - ISC-M2: Backfill is exactly `{Cybersecurity}` for 13 rows, `{Cybersecurity, Software Engineering}` for Barclays/Cisco UK/IBM UK. — REST query result matches exactly.
  - ISC-M3: `getCuratedEmployersToWatch` filters by `activeSectors` via `.overlaps("sector", ...)`, not a hardcoded sector. — `Read` confirms the query; direct REST replication of the same `.overlaps` filter for three synthetic profiles (Software Engineering, Cybersecurity, Data & AI) returns exactly the expected employer sets each time (4 / 16 / 0).
  - ISC-M4: Discovery gate (`discovery/page.tsx`) always calls `getCuratedEmployersToWatch(supabase, activeSectors)`, no `.includes("Cybersecurity")` gate left. — `Read` confirms; `tsc`/`eslint`/`next build` (Node 22) all clean.
  - ISC-M5: Admin employer forms (add + per-row edit) both carry the Sector checkbox fieldset, wired through `addEmployerSource`/`updateEmployerSource`. — `Read` confirms both forms and both actions.
  - ISC-M6: `scripts/seed-employer-sources.ts` parses/validates a `Sector` markdown column against `SECTOR_OPTIONS`. — re-ran the script against the updated `seed-data/employer-sources-seed.md`; same 16 names re-upserted, zero duplicates, sector values intact after re-run (idempotency confirmed).
  - ISC-M7: L'Oréal added as a new `employer_sources` row. — REST insert returned the new row with `id`, `sector: ["Software Engineering"]`.
  - ISC-M8: All 4 real listings (Barclays ×2, Cisco UK, L'Oréal; IBM skipped — closed) added as real `vacancies` rows via `scripts/add-curated-vacancy.ts` (the same production code path the admin UI uses, not a raw insert). — REST query confirms all 4 rows, correct `sector: ["Digital"]`, `apprenticeship_level: 6`, real closing/start dates and real employer ATS `apply_url`s.
  - ISC-M9: Anti — adding a vacancy for an already-tracked employer must not silently skip the email-notify pipeline. — it fired for real (Barclays, Cisco UK), confirmed via the script's own warning output and a follow-up query showing both registrations cleared.
  - ISC-M10: Anti — L'Oréal's geocoding failure (postcode terminated per postcodes.io, confirmed via direct API call, not assumed) must degrade gracefully, not break the upsert. — vacancy inserted successfully with `latitude`/`longitude` null and a warning, matching existing `upsertCuratedVacancy` behavior for any postcode that fails to geocode.
  - Coverage: 10/10 tool-verified this run.

- **2026-09-21 task — automated employer-vacancy checker:**
  - ISC-C1: `employer_vacancy_leads` table and `employer_sources.last_checked_at` exist on the live DB. — `bunx supabase db push` applied; REST select on both confirmed present.
  - ISC-C2: The cron route enforces `Bearer CRON_SECRET` auth. — same pattern as `sync-vacancies`, unchanged; not re-tested without the header (already proven by the existing route's own history).
  - ISC-C3: A real check genuinely calls the Anthropic API with `web_search` and returns structured leads. — L'Oréal run returned 3 real, well-formed (if substantively wrong) JSON objects with real URLs, not an error or empty response.
  - ISC-C4: Anti — a check must never write straight to `vacancies`. — confirmed: all 3 L'Oréal leads landed in `employer_vacancy_leads` with `status: pending`; `vacancies` untouched.
  - ISC-C5: Anti — a timed-out check must not crash the route or leave `last_checked_at` stale forever. — 2 separate timeout pairs (BT Group/GCHQ, then Cisco UK/Civil Service) both returned a clean 200 with `error: "Request timed out."` per employer, and both employers' `last_checked_at` updated regardless — confirmed via direct REST query, not assumed from the response alone.
  - ISC-C6: The `portal_url` regression (found live, not anticipated) is fully fixed — all 13 real URLs restored, `scripts/seed-employer-sources.ts` no longer touches that column. — REST dump post-fix showed all 13 intact; re-ran the script live as a regression test and confirmed they survived a second time.
  - ISC-C7: [DEFERRED-VERIFY] Admin "Vacancy leads" UI renders correctly and Publish/Dismiss work end-to-end in a real browser session. `tsc`/`eslint`/`next build` all clean and the form reuses the exact pre-filled-checkbox pattern already proven live on the employer Sector fieldset the night before, but not re-verified via an authenticated browser session this run (same bar applied as the Sector fieldset check) — follow-up: confirm live next time `/admin` is opened for real.
  - Coverage: 6/7 tool-verified this run, 1 deferred with a named follow-up (same file, admin UI next-use check).

- **2026-09-21 task — Discovery sector filter, start-year, and the real responsiveness fix:**
  - ISC-D1: Cold `geocodePostcode` round-trip genuinely takes multiple seconds. — direct timed `fetch` to postcodes.io: 3243ms cold, 84-118ms warm across 3 repeats.
  - ISC-D2: `profiles` had zero lat/lng caching before this change. — schema read confirmed no such columns existed pre-migration.
  - ISC-D3: `profiles.latitude`/`longitude` exist on the live DB post-migration. — REST select confirmed present (null on existing rows, as expected pre-backfill).
  - ISC-D4: The save-time geocode-and-cache path works for real. — ran the exact `geocodePostcode` + admin-client update pattern `applyProfileUpdate` uses against Archie's own real profile (`HP22 5TG`): wrote real coordinates (51.788067, -0.777633), read back confirmed.
  - ISC-D5: `vacancies_sector_gin_idx` exists. — migration (which creates it) applied with no error; a failed index creation would have failed the whole transactional migration, not silently skipped.
  - ISC-D6: The new FAA-route sector labels in `DISCOVERY_SECTOR_OPTIONS` match real, currently-stored `vacancies.sector` values, not approximated ones. — queried live: 14/15 in a 5000-row sample, 15th ("Protective services") confirmed via a targeted containment query.
  - ISC-D7: Sector filter + start-year filter combine correctly against real data. — direct REST query (`sector=ov.{Digital}` + `start_date` range for 2027) returned real matches including the Barclays/Cisco/L'Oréal rows from the night before.
  - ISC-D8: Anti — "Employers to watch" must not silently break when decoupled from the page's vacancy-sector filter. — unchanged query shape (`getCuratedEmployersToWatch`), only the input source changed (`profile.sectors_of_interest` instead of the page's `activeRoutes`); same `.overlaps()` behavior already verified live the night before.
  - ISC-D9: `tsc --noEmit`, `eslint`, and a real `next build` (Node 22) all clean after every change in this task.
  - Coverage: 9/9 tool-verified this run.

- **2026-09-21 task — live end-to-end test after deploy, real bugs found and fixed:**
  - ISC-E1: All 10 prior commits were unpushed. — `git log --oneline origin/main..HEAD` listed all 10; `git push` then `vercel inspect apprentio.app` confirmed a fresh deployment (created seconds after push) serving the domain.
  - ISC-E2: New sector labels, start-year picker, and decoupled "Employers to watch" (13, not 16, correctly excluding the now-live Barclays/Cisco) render correctly on real production for a real logged-in user. — `get_page_text`/screenshot on `apprentio.app/discovery` as the QA account.
  - ISC-E3: The 4 target vacancies (Barclays ×2, Cisco, L'Oréal) were NOT appearing despite correct sector/level/closing_date. — reproduced live (0 matches, "Any distance" didn't help), traced to null `latitude`/`longitude` on all 4 via direct query.
  - ISC-E4: Real, current postcodes fixed the visibility. — Barclays WA16 9EU, Cisco TW14 8HA, L'Oréal W12 7SA, each verified via postcodes.io before writing; re-loaded Discovery live afterward — 4 matches, real distances computed (27.5mi, 30.3mi, 121.9mi ×2).
  - ISC-E5: Vacancy detail page renders correctly for a real vacancy. — screenshot of Cisco's detail panel showed correct title/employer/level/sector/location/dates/description.
  - ISC-E6: Anti — curated vacancies must link to the specific job, not the employer's generic careers page. — found live (Cisco's link went to the general hub); fixed in `vacancy-detail-content.tsx`; re-verified live post-deploy — same link now correctly points at the specific `/apply?jobSeqNo=...` URL.
  - ISC-E7: register/unregister interest creates and deletes a real row. — clicked live on GCHQ CyberFirst as the QA account; confirmed via direct query both ways (row created, then row gone).
  - ISC-E8: The deployed `check-employer-vacancies` cron responds correctly on real production (not just local dev). — triggered directly with the real `CRON_SECRET`; got a clean structured response (first: graceful timeouts with `last_checked_at` updated; second: a clear, real, non-code-related Anthropic billing error, not a crash).
  - ISC-E9: Anti — the geocode-cache write-back (this task's whole reason for existing) must actually persist, not just compute in-memory. — found it wasn't (`updated_at` never changed after real Discovery visits); replicated the exact real-user update standalone and got the actual Postgres `42501` error; traced to a missing column-level `GRANT` (established pattern in this codebase, two prior identical fixes existed already); applied the matching grant; re-ran the identical failing call (succeeded) and then a real fresh Discovery visit (self-heal persisted, `updated_at` changed, confirmed via direct query).
  - ISC-E10: No console errors on Discovery, vacancy detail, board, or profile pages during the whole live session. — `read_console_messages` with `onlyErrors: true` checked at each page.
  - ISC-E11: QA test account fully cleaned up. — `admin.auth.admin.deleteUser` then `getUserById` confirmed gone (cascades to profile/registrations via FK).
  - Coverage: 11/11 tool-verified this run. Anthropic credit exhaustion (ISC-E8's second finding) is a real blocker but is a billing action outside what I can fix — logged to TODO.md, not silently absorbed into "done."

- **2026-09-22 task — Anthropic credits confirmed restored, then a real drafting timeout root-caused and fixed:**
  - ISC-F1: Anthropic credits are actually restored, not just assumed from Archie saying so. — re-triggered the real production cron twice: zero billing errors either time (one genuine successful check with `leadsFound: 0`, the rest normal timeout variance already documented).
  - ISC-F2: `researchViaWebSearch`'s stated 300s Vercel limit is wrong. — directly contradicts `vercel teams ls` confirming Hobby (60s), independently established the night before for the employer-vacancy-checker fix.
  - ISC-F3: The real fix bounds the research call to something the platform can actually honor (25s), not a bigger number. — edited with an explicit rationale tying the timeout to the confirmed real ceiling, not the incorrect assumption.
  - ISC-F4: A failed/slow research call no longer takes the whole draft down. — `draft.ts`'s `Promise.all` entry for research now has a `.catch()` returning the same shape the "found: false" prompt branch already expects.
  - ISC-F5: The draft-generation call itself is now bounded (was previously unbounded). — explicit `{ timeout: 30000, maxRetries: 0 }` added.
  - ISC-F6: `tsc --noEmit`, `eslint`, and a real `next build` (Node 22) all clean.
  - ISC-F7: A real drafting request completes fast and correctly post-fix. — full real pipeline (new account, real uploaded CV/cover-letter, real application against the live Cisco vacancy, real Draft click): completed in well under 20s; `applications.drafted_cv`/`drafted_cover_letter` read back directly showing genuine content correctly naming Cisco UK and the specific role, not a generic/degraded fallback.
  - ISC-F8: Test account and uploaded storage files fully cleaned up. — `admin.auth.admin.deleteUser` + explicit `storage.remove()` on both uploaded files, confirmed no error.
  - Coverage: 8/8 tool-verified this run.

## Changelog

- conjectured: TODO.md's checked-off items are sufficient evidence of launch readiness on their own, given they document tool-verified claims from prior sessions.
- refuted_by: the commitment-boundary advisor call, correctly pointing out that a checkmark is a *prior-session claim*, not current-session evidence — the exact failure mode a separate, prior ISA on this same account (Product Design NEA RedTeam, closed 2026-08-31) had already identified as its central finding (F2: plan documents accumulate claims that drift from reality; the fix is a mechanical probe that diffs claims against the artefact).
- learned: spot-checking "the highest-risk claims" is not the same discipline as F2's mechanical-probe fix — it still trusts the checklist's own framing of what's risky. The stronger move, applied properly only after the advisor call, was probing categories the checklist doesn't cover at all (RLS/authz via Supabase's own linter, not just headers; the actual confirmation-link click-through, not just "email delivered"; coupon *behavior* over its lifetime, not just its current active/count state) — i.e. asking "what would a mechanical probe of the *real system* turn up that the document never claimed one way or the other," not just re-verifying the document's own claims.
- criterion_now: for any future Apprentio audit, treat TODO.md checkmarks as a map of *what to probe*, not evidence in themselves — and explicitly probe at least one category the existing checklist is silent on (this run: RLS/authz, magic-link redirect correctness, coupon lifecycle) rather than only re-confirming categories it already claims are done.
