---
id: T3
title: "Define the disposition set, the run result and the accounting check"
layer: "domain"
deps: ["T1"]
blocks: ["T4", "T12", "T13", "T16", "T17"]
acs: ["AC-10"]
files_hint: ["src/domain/disposition.ts", "test/domain/disposition.test.ts"]
owner: "Serhii Lyzun"
estimate: "M"
context_budget: "M"
status: "todo"
---

<!-- To the executing agent: work from what is inlined here. If a slice is insufficient, ambiguous,
or contradicts the code in front of you, open the named file for the full text and follow that.
Do not invent the missing part. Every inline is a snapshot with a provenance signature; the source wins. -->

# T3 — Define the disposition set, the run result and the accounting check

## Place in the sequence

- **Blocked by:** T1 — Define the vacancy shape, the search input type, the clock and the repost fingerprint · **Blocks:** T4 — Define the three seam interfaces with their typed failures, the test fakes, and fix the fail-loudly wording, T12 — Classify cards: drop, skip seen and reposts, and order the candidates, T13 — Implement runSearch: list, classify, hydrate and judge under the limit, present, mark seen, T16 — Render the fit-sorted vacancy list with its tags and marks, T17 — Render the coverage report, the loud warnings and the whole result document · **Wave:** 2, its last dependency, T1, sits in wave 1.
- **Lane:** Own lane.

## Why (user story)

> **As a** Job seeker
> **I want** every run to end with a coverage report and a loud warning when a source returned nothing or only part
> **So that** a quiet or partial read never looks like "no jobs for you"
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task gives every read vacancy exactly one final disposition and derives the counts from them, so the coverage report adds up by construction.

## Inlined context

> **Chosen:** Option 1. The sum equals the read count by construction, and adding a new disposition is a compile-time change to every place that renders or counts one.
>
> […]
>
> 1. **One disposition per read vacancy; the report derives from them** — every read vacancy carries exactly one final value (`dropped_date`, `dropped_salary`, `seen`, `repost`, `not_judged` with a reason, `judged`) assigned in the AC-10 order; the report counts them and checks that the sum equals the read count; the search function always returns a result, turning an unexpected exception into a "RUN FAILED" entry and every unfinished vacancy into `not_judged`.
>
> — `adr/0003 §Decision outcome, chosen option and option 1, abridged` · full text: [adr/0003](../adr/0003-record-one-disposition-per-read-vacancy-and-derive-the-report.md)

> 6. **Close the accounts** — every vacancy not reached becomes "not judged" with its cause.
>
> — `sad.md §4, «How a run flows» step 6, verbatim` · full text: [sad.md](../sad.md)

> | Concept | Convention | Where defined |
> |---|---|---|
> | Error handling | Expected conditions are typed values: source stops (ADR 0002) and judge failure classes (ADR 0004). `zod` validates every boundary: the search input, the CV, parsed pages and the judge's answer. One catch in the pipeline turns an unexpected exception into a failed run that is still reported. Nothing is swallowed. `CLAUDE.md` says a source "raises" a typed error; ADR 0002 keeps its spirit and needs a one-sentence wording update when implemented. | ADR 0002, ADR 0004, `CLAUDE.md` Rules |
>
> — `sad.md §8, «Error handling», verbatim` · full text: [sad.md](../sad.md)

> **Fail loudly.** A source that fails or returns nothing raises a typed error that the coverage report shows. Never swallow an error; never print an empty list without its coverage line.
>
> — `CLAUDE.md §Rules, Fail loudly, verbatim` · full text: [CLAUDE.md](../../../../CLAUDE.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full ([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) · [cli.md](../contracts/cli.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface of its own; the reason codes are printed in the report and fixed by the CLI contract.

> | Code | Meaning | Fails the run |
> |---|---|---|
> | `source.blocked`, `source.throttled`, `source.failed` | The source stopped before the vacancy was hydrated | yes |
> | `judge.key_rejected` | The AI service rejected the key | yes (AC-07b) |
> | `judge.allowance_exhausted` | No allowance left | yes (AC-07b) |
> | `judge.unreachable` | No answer after the client's own retries | yes (AC-07b) |
> | `judge.service_rejected` | Any other non-retryable AI rejection, for example an unknown `--model` `# unresolved` OQ-2 | yes |
> | `judge.unusable_answer` | The answer was unusable or failed the schema check; only this vacancy is affected | no (AC-07) |
> | `search.judging_limit` | Over the judging limit; treated as new next time (AC-22) | no |
> | `search.unexpected_error` | An exception no typed value covers; the message never holds CV text or the key | yes |
>
> Run failures without a "not judged" reason: `store.unusable` (the seen memory cannot be opened, created or migrated: nothing is read, empty accounting, `RUN FAILED`, exit 1) and `output.print_failed` (the result could not be printed: plain message on stderr, nothing marked seen, exit 1).
>
> — `contracts/cli.md §6.2, Reasons for «not judged», verbatim` · full text: [cli.md](../contracts/cli.md)

## Acceptance criteria

### AC-10 — happy path

> **Given** a search finishes, whatever its outcome
> **When** the result is printed
> **Then** it ends with the coverage report stating, for each source, how many vacancies were read and how each read vacancy was accounted for: dropped for date, dropped for salary, skipped as already seen, skipped as reposts, not judged with the reason, or judged, each counted in exactly one of these, checked in that order, so that they add up to the read count; plus how many were kept without a stated salary and how many without a stated date (both counted within the buckets above), plus how long the run took
>
> — `spec.md §5, AC-10, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `src/domain/disposition.ts`: closed `Disposition` union — `dropped_date`, `dropped_salary`, `seen`, `repost`, `not_judged` {reason}, `judged` {judgment, tags, marks} — and the `NotJudgedReason` codes of cli.md §6.2 (`source.*`, `judge.*`, `search.*`)
- [ ] Same file: the run result — per source, one record per read vacancy (the `Vacancy` plus its one `Disposition`), optional `expectedCount`, optional source `stop`, optional `partialRead` {read, expected}; plus `judgmentsMade`, `judgingLimit`, `durationMs` and the run's failure causes (source stop, judging stopped, unexpected error, accounting mismatch, `store.unusable`, `output.print_failed`)
- [ ] `tally(records)`: counts per bucket in the AC-10 order, the not-judged breakdown by reason, and the two informational counts (kept without a stated salary, kept without a stated date — 'kept' meaning not dropped for date or salary); `accountingMatches(tally, read)`
- [ ] Exhaustive `switch` helper with a `never` check so a new disposition kind breaks compilation everywhere it is counted or rendered
- [ ] `test/domain/disposition.test.ts`

## Edge cases

| Case | Behaviour |
|---|---|
| A read vacancy is left with no disposition at the end of a run | internal error: it becomes `not_judged: search.unexpected_error`, the run fails (ADR 0003) |
| Buckets do not add up to the read count | `accountingMatches` is false; the run fails and the report prints the mismatch warning (T17) |
| `source.empty` | never a `not_judged` reason — an empty source has no read vacancies |
| Kept-without-stated counts | counted within the buckets, never a bucket of their own, never change the sum |
| Zero vacancies read | all counts 0 and the sum matches |

## Definition of Done

- [ ] unit tests: buckets add up for mixed dispositions, mismatch detected, reason breakdown correct
- [ ] adding a disposition kind fails compilation at every switch (checked once by hand and noted in the PR)
- [ ] `src/domain/` stays free of I/O
- [ ] `npm run lint` and `npm run build` clean (the per-task gate)
