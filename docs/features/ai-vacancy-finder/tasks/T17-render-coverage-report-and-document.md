---
id: T17
title: "Render the coverage report, the loud warnings and the whole result document"
layer: "app"
deps: ["T3", "T16"]
blocks: ["T19"]
acs: ["AC-10", "AC-11", "AC-12", "AC-16"]
files_hint: ["src/report/coverage.ts", "src/report/warnings.ts", "src/report/render.ts", "test/report/render.test.ts"]
owner: "Serhii Lyzun"
estimate: "M"
context_budget: "M"
status: "todo"
---

<!-- To the executing agent: work from what is inlined here. If a slice is insufficient, ambiguous,
or contradicts the code in front of you, open the named file for the full text and follow that.
Do not invent the missing part. Every inline is a snapshot with a provenance signature; the source wins. -->

# T17 — Render the coverage report, the loud warnings and the whole result document

## Place in the sequence

- **Blocked by:** T3 — Define the disposition set, the run result and the accounting check, T16 — Render the fit-sorted vacancy list with its tags and marks · **Blocks:** T19 — Wire the adapters in src/cli.ts and set the output streams and exit status · **Wave:** 4, its last dependency, T16, sits in wave 3.
- **Lane:** Same folder as T16 but different files; T16's `renderList` is composed here.

## Why (user story)

> **As a** Job seeker
> **I want** every run to end with a coverage report and a loud warning when a source returned nothing or only part
> **So that** a quiet or partial read never looks like "no jobs for you"
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task ends every run with a coverage report that adds up and a loud warning naming any stop, so a quiet or partial read never looks like 'no jobs for you'.

## Inlined context

> 7. **Render** — the list (untagged vacancies by fit, then tagged ones by fit), the loud warnings and the coverage report, all derived from the dispositions.
>
> — `sad.md §4, «How a run flows» step 7, verbatim` · full text: [sad.md](../sad.md)

> | Concept | Convention | Where defined |
> |---|---|---|
> | Output and exit status | The whole result (list, loud warnings, coverage report) is one document on stdout, so a warning above the report survives redirection to a file. Invalid input, an unreadable CV or a missing key writes a plain message to stderr, exits 2 and reads nothing. A failed run (a source blocked, throttled, failed or empty; an AI service failure; an accounting mismatch; an unusable database) puts a `RUN FAILED` line in the coverage report and exits 1. A partial-read warning alone, or "no new vacancies", exits 0. | here; command contract at the `api` stage |
>
> — `sad.md §8, «Output and exit status», verbatim` · full text: [sad.md](../sad.md)

> | Aspect | Target | Measurement |
> |---|---|---|
> | Coverage report completeness | 100% of runs end with a coverage report, including failed runs | automated test for every failure mode |
>
> — `spec.md §6, NFR: coverage completeness, verbatim` · full text: [spec.md](../spec.md)

> **Fail loudly.** A source that fails or returns nothing raises a typed error that the coverage report shows. Never swallow an error; never print an empty list without its coverage line.
>
> — `CLAUDE.md §Rules, Fail loudly, verbatim` · full text: [CLAUDE.md](../../../../CLAUDE.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full ([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) · [cli.md](../contracts/cli.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface of its own; the printed document is the CLI contract's.

> ```
> <vacancy list, or one of the no-list messages>
>
> <loud warnings, zero or more>
>
> COVERAGE REPORT
> <per-source block>
> <Judgments made / Duration>
> <RUN FAILED line, when the run failed>
> ```
>
> […]
>
> | Situation | Message |
> |---|---|
> | Vacancies were read, none is listed, and none is "not judged": all were seen, reposts or dropped by filters (AC-16) | `No new vacancies. Read <n>, skipped <s> already seen and <r> reposts, dropped <d>.` |
> | Vacancies were read, none is listed, at least one was "not judged", and the run did not fail (only `judge.unusable_answer` or `search.judging_limit` leave a run unfailed) `# unresolved` OQ-3 | `No vacancies listed: <n> could not be judged, see the coverage report.` |
>
> […]
>
> | Trigger | Text |
> |---|---|
> | A source stop (AC-04, AC-11, AC-23) | `WARNING: source <name> was <blocked | throttled | failed | empty>: <detail>. <n> vacancies were not read or not judged because of it.` |
> | The AI service stopped (AC-07b) | `WARNING: judging stopped: <cause>. <n> vacancies were not judged.` |
> | A partial read (AC-12) | `WARNING: partial read from <name>: read <k> of <e> expected.` (does not fail the run) |
> | An unexpected error | `WARNING: unexpected error: <sanitised message>.` (never CV text or the key) |
> | Accounting mismatch | `WARNING: the coverage buckets add up to <x> but <n> vacancies were read.` (fails the run) |
>
> […]
>
> ```
> COVERAGE REPORT
> Source: linkedin
>   Read: 45
>     Dropped for date:           5
>     Dropped for salary:         4
>     Skipped, already seen:     20
>     Skipped, reposts:           3
>     Not judged:                 3
>       judging limit:           3   (may include vacancies the salary filter would have dropped)
>     Judged:                    10
>   Kept without a stated salary: 6   (counted within the buckets above)
>   Kept without a stated date:   2   (counted within the buckets above)
>   Expected by the site:        120  (read 45)          <- only when the site states a count
> Judgments made: 10 of a limit of 30
> Duration: 3 min 12 s
> ```
> - Buckets, in the AC-10 order: dropped for date, dropped for salary, skipped as already seen, skipped as reposts, not judged (broken down by reason, §6.2), judged. With `--show-everything`, seen vacancies and reposts are candidates and are counted as judged or not judged, and the reposts count is still printed (AC-20).
> - `Judgments made` is the number of fit-judge calls; it never exceeds the limit (spec §6).
> - `Duration` comes from the injected `Clock`.
> - A failed run ends the report with `RUN FAILED: <cause>` (AC-11). A run that did not fail has no such line.
>
> — `contracts/cli.md §5.2 and 5.3, layout, no-list messages, loud warnings, coverage report, abridged` · full text: [cli.md](../contracts/cli.md)

## Acceptance criteria

### AC-10 — happy path

> **Given** a search finishes, whatever its outcome
> **When** the result is printed
> **Then** it ends with the coverage report stating, for each source, how many vacancies were read and how each read vacancy was accounted for: dropped for date, dropped for salary, skipped as already seen, skipped as reposts, not judged with the reason, or judged, each counted in exactly one of these, checked in that order, so that they add up to the read count; plus how many were kept without a stated salary and how many without a stated date (both counted within the buckets above), plus how long the run took
>
> — `spec.md §5, AC-10, verbatim` · full text: [spec.md](../spec.md)

### AC-11 — domain invariant

> **Given** a source was blocked, failed, was throttled, or returned no vacancies at all
> **When** the search completes
> **Then** the system never prints a bare empty list: it prints a loud warning naming the source and whether it was blocked, failed, throttled or returned nothing, above the coverage report, and marks the run as failed, meaning the run ends with a non-zero exit status and a "RUN FAILED" line in the coverage report; a run that read at least one vacancy and lists none because all were already seen, reposts or dropped by the filters is not failed and ends with the message of AC-16
>
> — `spec.md §5, AC-11, verbatim` · full text: [spec.md](../spec.md)

### AC-12 — cross-context

> **Given** the source states how many vacancies match the search
> **When** this search reads less than half of that number
> **Then** the coverage report warns of a partial read and shows how many were read out of how many were expected; this warning alone does not mark the run as failed
>
> — `spec.md §5, AC-12, verbatim` · full text: [spec.md](../spec.md)

### AC-16 — happy path

> **Given** the job seeker ran a search earlier and it listed vacancies
> **When** the job seeker runs a search that reads some of those vacancies again
> **Then** only vacancies not shown in any earlier search are listed, the coverage report says how many already seen were skipped, and when nothing is new the system says there are no new vacancies together with the read and skipped counts
>
> — `spec.md §5, AC-16, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `src/report/coverage.ts`: `renderCoverage(result)` — one block per source in the AC-10 bucket order, the not-judged breakdown by reason (the limit line carries the 'may include vacancies the salary filter would have dropped' note), the two kept-without-stated counts, `Expected by the site` only when a count was stated, `Judgments made: X of a limit of N`, `Duration` from the result as `M min SS s`, and `RUN FAILED: <cause>` last when the run failed
- [ ] `src/report/warnings.ts`: the five warning texts (source stop, AI service stopped, partial read, unexpected error, accounting mismatch), each naming its cause; the partial-read warning never adds `RUN FAILED`
- [ ] `src/report/render.ts`: `renderDocument(result)` = the list (T16) or the matching no-list message, then the warnings, then the coverage report; the list is never printed without the report after it
- [ ] Exhaustive `switch` over dispositions, stop kinds and reasons (T3, T4) so a new one cannot be forgotten
- [ ] `test/report/render.test.ts`: reproduce cli.md §8.1, §8.3 and §8.4 as golden output, plus one test per failure mode asserting the report exists and ends in `RUN FAILED`

## Edge cases

| Case | Behaviour |
|---|---|
| The source returned nothing | `Read: 0`, all buckets 0, the warning, `RUN FAILED` — never a bare empty list (AC-11) |
| Read some, listed none, all seen, reposts or dropped by filters | `No new vacancies. Read <n>, skipped <s> already seen and <r> reposts, dropped <d>.` and exit-0 wording, no `RUN FAILED` (AC-16) |
| Read some, listed none, some not judged, run not failed | `No vacancies listed: <n> could not be judged, see the coverage report.` — cli.md marks it `# unresolved` (OQ-3); implement as written |
| A failed run that also has a list | list, then the warning, then the report, `RUN FAILED` last |
| Buckets do not add up | the mismatch warning and `RUN FAILED` |
| Duration under one minute | printed as `0 min 09 s` |
| Several warnings | each is its own block above the report |

## Definition of Done

- [ ] golden tests reproduce the cli.md examples and pass; every failure mode ends with a coverage report and `RUN FAILED`
- [ ] the buckets in every rendered report add up to `Read` (asserted)
- [ ] no CV text or key can reach the output (the renderer never receives them)
- [ ] every Hard Rule inlined above still holds
- [ ] `npm run lint` and `npm run build` clean (the per-task gate)
