---
id: T13
title: "Implement runSearch: list, classify, hydrate and judge under the limit, present, mark seen"
layer: "app"
deps: ["T2", "T3", "T4", "T12"]
blocks: ["T14"]
acs: ["AC-01", "AC-17", "AC-21", "AC-22"]
files_hint: ["src/search/run-search.ts", "test/search/run-search.test.ts"]
owner: "Serhii Lyzun"
estimate: "M"
context_budget: "M"
status: "todo"
---

<!-- To the executing agent: work from what is inlined here. If a slice is insufficient, ambiguous,
or contradicts the code in front of you, open the named file for the full text and follow that.
Do not invent the missing part. Every inline is a snapshot with a provenance signature; the source wins. -->

# T13 — Implement runSearch: list, classify, hydrate and judge under the limit, present, mark seen

## Place in the sequence

- **Blocked by:** T2 — Implement the date and salary filters and their tags as pure rules, T3 — Define the disposition set, the run result and the accounting check, T4 — Define the three seam interfaces with their typed failures, the test fakes, and fix the fail-loudly wording, T12 — Classify cards: drop, skip seen and reposts, and order the candidates · **Blocks:** T14 — Handle source stops and partial reads in runSearch · **Wave:** 5, its last dependency, T12, sits in wave 4.
- **Lane:** Shares `src/search/run-search.ts` with T14 and T15 — serialized, in that order.

## Why (user story)

> **As a** Job seeker
> **I want** to run a search with my position, salary range, posted-since date, location or remote, and CV
> **So that** I get the relevant public vacancies without visiting sites by hand
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task runs the happy-path pipeline end to end against the three seams, so a search reads, filters, judges within the limit and shows only what it then remembers.

## Inlined context

> 1. **Preflight** — validate the inputs (AC-02), read the CV (AC-03), require the AI key (AC-05) and open the seen database. Any failure stops here, before a single request, with a plain message.
> 2. **List** — the source returns cards, an optional expected count and an optional stop (ADR 0001, 0002).
>
> […]
>
> 5. **Hydrate and judge, one vacancy at a time** — fetch the full vacancy, check its salary if the card did not state it, judge it, and stop when the judging limit is filled, the candidates run out, or judging fails at service level (ADR 0004).
> 6. **Close the accounts** — every vacancy not reached becomes "not judged" with its cause.
> 7. **Render** — the list (untagged vacancies by fit, then tagged ones by fit), the loud warnings and the coverage report, all derived from the dispositions.
> 8. **Mark seen** — only after rendering, only vacancies that were shown, in one transaction (AC-22). If the process dies between rendering and marking, a vacancy may come back as new, which is the safe direction.
>
> — `sad.md §4, «How a run flows» steps 1, 2 and 5–8, abridged` · full text: [sad.md](../sad.md)

> **Chosen:** Option 1. Tests call `runSearch` with fakes and cover each acceptance criterion in-process, and the composition root stays a place where things are only wired.
>
> […]
>
> 1. **A new `src/search/` module** — `runSearch(input, {source, judge, store, clock})` returns a run result; `src/cli.ts` only parses arguments, reads the CV, wires the adapters, prints and sets the exit status.
>
> — `adr/0005 §Decision outcome, chosen option and option 1, abridged` · full text: [adr/0005](../adr/0005-run-the-search-pipeline-in-its-own-module-with-adapters-passed-in.md)

> The pipeline hands the finished result to a presenter that the CLI supplies (which uses the Report), and marks vacancies seen only after the presenter returns; if printing fails, nothing is marked and the vacancies come back as new.
>
> — `sad.md §6, runtime view intro, the presenter, abridged` · full text: [sad.md](../sad.md)

> | Aspect | Target | Measurement |
> |---|---|---|
> | Duration of a search at the default judging limit | ≤ 5 min p95 | run duration printed in the coverage report |
> | Judgments per search | ≤ the judging limit (default 30) in 100% of runs | judged count in the coverage report; offline test with a fake judge |
>
> — `spec.md §6, NFR: judgments and duration, verbatim` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full ([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) · [cli.md](../contracts/cli.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface of its own; the guarantees below are the CLI contract's.

> - **Seen-marking.** Only vacancies that were shown are marked seen, in one transaction, only after the result was printed. A vacancy that was dropped, not judged or lost to a failure is not marked and comes back as new (AC-18, AC-22). If printing fails, nothing is marked. The write is idempotent, so `--show-everything` re-marks safely.
> - **Bounded cost.** At most `--judging-limit` fit-judge calls per search, sequential; at most 1 page request per second per source; ≤ 3 retries and ≤ 1 min of waiting per source (spec §6).
>
> — `contracts/cli.md §7, Guarantees, seen-marking and bounded cost, verbatim` · full text: [cli.md](../contracts/cli.md)

## Acceptance criteria

### AC-01 — happy path

> **Given** the job seeker has a readable CV and gives a position, a salary range, a posted-since date and a location or remote
> **When** the job seeker runs the search
> **Then** the system reads the source's public vacancy pages, prints apply links to the vacancies that passed the filters, and ends with a coverage report
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-17 — happy path

> **Given** the job seeker asks to show everything
> **When** the search runs
> **Then** all vacancies that passed the filters are listed, including those shown before, each marked as seen before; vacancies shown before are judged again like any other and count toward the judging limit, new vacancies first and then those shown before newest first, and any left over the limit are reported as not judged because of the limit
>
> — `spec.md §5, AC-17, verbatim` · full text: [spec.md](../spec.md)

### AC-21 — happy path

> **Given** more new vacancies pass the filters than the judging limit allows
> **When** the search runs
> **Then** only that many are judged, newest first (by the best estimate of the posted date from its date or rough age, vacancies with no date last), and the coverage report states how many were not judged because of the limit
>
> — `spec.md §5, AC-21, verbatim` · full text: [spec.md](../spec.md)

### AC-22 — domain invariant

> **Given** vacancies were not judged because of the limit or a failure
> **When** the job seeker searches again
> **Then** those vacancies are treated as new and are judged, because a vacancy counts as seen only once it has been shown
>
> — `spec.md §5, AC-22, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `src/search/run-search.ts`: `runSearch(input, cv, deps)` with `deps = { source, judge, openStore, clock, present }` — `present(result)` is supplied by the CLI; the function returns the run result and the exit status
- [ ] Order of work: open the store (`deps.openStore`, T4 — its failure is T15) → `source.list` → `classifyCards` (T12) → loop over the ordered candidates: hydrate, salary verdict (T2) on the hydrated vacancy when the card stated no pay (drop → `dropped_salary`, no judge call), judge, count the call, record `judged`
- [ ] Stop hydrating when the number of judge calls reaches `judgingLimit` or the candidates run out; every call counts, including an unusable answer (cli.md §7); leftovers become `not_judged: search.judging_limit`
- [ ] Show-everything candidates (seen before or repost) are judged again like any other and count toward the limit
- [ ] Close the accounts: build the run result (T3) with every read vacancy's disposition, `judgmentsMade`, and the duration from `clock`
- [ ] `await deps.present(result)`; only after it returns, `store.markShown(judged vacancies)` in one call with `first_shown_at` from the clock; nothing is marked when nothing was judged
- [ ] `test/search/run-search.test.ts` through `runSearch` with `FakeSource`, `FakeJudge`, `FakeSeenStore`, `FakeClock`

## Edge cases

| Case | Behaviour |
|---|---|
| More candidates than the limit | exactly `limit` judge calls; the rest `not_judged: search.judging_limit` and not marked seen, so they come back as new (AC-22) |
| A candidate dropped for salary after hydration | `dropped_salary`, no judge call, the limit is not consumed |
| Show everything with shown-before candidates | judged again, re-marked idempotently, left-overs reported as limit (AC-17) |
| The presenter has not returned | nothing is marked seen yet |
| No candidates but vacancies were read | the result is still presented; not a failure by itself (AC-16 wording is T17) |

## Definition of Done

- [ ] offline tests through `runSearch` pass: happy path, limit respected with a call-counting fake judge, leftovers not marked seen, marks only after present
- [ ] `Judgments made` never exceeds the limit in any test
- [ ] every Hard Rule inlined above still holds
- [ ] `npm run lint` and `npm run build` clean (the per-task gate)
