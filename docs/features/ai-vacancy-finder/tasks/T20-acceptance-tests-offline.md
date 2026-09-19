---
id: T20
title: "Add the cross-cutting offline acceptance tests for the quality scenarios"
layer: "tests"
deps: ["T19"]
blocks: []
acs: ["AC-10", "AC-16"]
files_hint: ["test/e2e/failure-modes.test.ts", "test/e2e/seen-memory.test.ts", "test/e2e/limit.test.ts", "test/e2e/confidentiality.test.ts", "test/e2e/fixtures-run.test.ts"]
owner: "Serhii Lyzun"
estimate: "M"
context_budget: "M"
status: "todo"
---

<!-- To the executing agent: work from what is inlined here. If a slice is insufficient, ambiguous,
or contradicts the code in front of you, open the named file for the full text and follow that.
Do not invent the missing part. Every inline is a snapshot with a provenance signature; the source wins. -->

# T20 — Add the cross-cutting offline acceptance tests for the quality scenarios

## Place in the sequence

- **Blocked by:** T19 — Wire the adapters in src/cli.ts and set the output streams and exit status · **Blocks:** — · **Wave:** 9, its last dependency, T19, sits in wave 8.
- **Lane:** Own lane.

## Why (user story)

> **As a** Job seeker
> **I want** every run to end with a coverage report and a loud warning when a source returned nothing or only part
> **So that** a quiet or partial read never looks like "no jobs for you"
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task proves the promises that cut across modules — every run ends with an adding-up coverage report, nothing is listed twice, cost stays bounded, and nothing confidential leaks.

## Inlined context

> **QG-1. Auditable runs**
> - **When:** a search ends, whatever the outcome: success, a source blocked, throttled, failed or empty, an AI service failure, or an unexpected exception.
> - **Then:** it ends with the coverage report, in which the buckets add up to the read count. When a source stopped (blocked, throttled, failed or empty) or judging failed at service level, a loud warning above the report names the cause and the run shows `RUN FAILED` with a non-zero exit status. A run that read vacancies and lists none because all were already seen, reposts or dropped by the filters is not failed and says so (AC-16), and a partial-read warning alone does not fail the run (AC-12). A bare empty list is never printed. 100% of runs end with a coverage report, including failed runs.
> - **How verify:** automated tests through `runSearch` with a fake source and a fake judge for every failure mode, asserting the report, the sum, the `RUN FAILED` line and the exit status; a test that every source stop kind reaches the report (ADR 0002, ADR 0003).
>
> — `sad.md §10, QG-1 auditable runs, verbatim` · full text: [sad.md](../sad.md)

> **QG-2. Bounded cost and polite pace**
> - **When:** a search runs at the default judging limit against a source with more candidates than the limit, or against a source that refuses requests.
> - **Then:** at most the judging limit (default 30) judgments are made in 100% of runs. Requests are at most 1 page request per second, counted for each source separately. A refused request is retried at most 3 times with at most 1 min of total waiting per source, then the source is reported as throttled. A search takes at most 5 min p95 at the default judging limit.
> - **How verify:** an offline test with a fake judge that counts its calls; offline tests against a fake clock for the pace and for the back-off (ADR 0006); the run duration printed in the coverage report, watched over real use.
>
> — `sad.md §10, QG-2 bounded cost, verbatim` · full text: [sad.md](../sad.md)

> **QG-3. Seen-memory correctness**
> - **When:** consecutive searches with the same details run without "show everything", including reposts of vacancies already shown.
> - **Then:** 0 vacancies are listed twice across consecutive same-detail searches. A repost is counted as a repost and not listed as new, and only vacancies that were shown count as seen.
> - **How verify:** an offline test that runs twice through `runSearch` over saved pages with a real SQLite store, plus a case with the same company and title under a new job number.
>
> — `sad.md §10, QG-3 seen-memory correctness, verbatim` · full text: [sad.md](../sad.md)

> **QG-5. Confidentiality of the CV and the key**
> - **When:** any run, including every failure mode.
> - **Then:** neither the AI key nor CV text appears in the list, the coverage report, an error message or the seen database; the only outward flow of CV text is to the Claude API with each judgment.
> - **How verify:** an automated test with a sentinel CV text and a sentinel key across success and every failure mode, asserting that neither appears in stdout, stderr or the database; the one-time security review before the first real run with a full CV (spec §6.1).
>
> — `sad.md §10, QG-5 confidentiality, verbatim` · full text: [sad.md](../sad.md)

> | Concept | Convention | Where defined |
> |---|---|---|
> | Testing seams | Sources are tested against saved real pages, the judge against a fake, the store against a real SQLite database (in memory or a temporary file), time against a fake clock, and the whole run through `runSearch`; no test touches the network. | `CLAUDE.md` Rules, ADR 0005 |
>
> — `sad.md §8, «Testing seams», verbatim` · full text: [sad.md](../sad.md)

> **Offline tests.** Sources are tested against saved real pages in `test/fixtures/`, never the live site. The fit judge is tested against a fake. No test touches the network.
>
> — `CLAUDE.md §Rules, Offline tests, verbatim` · full text: [CLAUDE.md](../../../../CLAUDE.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full ([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) · [cli.md](../contracts/cli.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-10 — happy path

> **Given** a search finishes, whatever its outcome
> **When** the result is printed
> **Then** it ends with the coverage report stating, for each source, how many vacancies were read and how each read vacancy was accounted for: dropped for date, dropped for salary, skipped as already seen, skipped as reposts, not judged with the reason, or judged, each counted in exactly one of these, checked in that order, so that they add up to the read count; plus how many were kept without a stated salary and how many without a stated date (both counted within the buckets above), plus how long the run took
>
> — `spec.md §5, AC-10, verbatim` · full text: [spec.md](../spec.md)

### AC-16 — happy path

> **Given** the job seeker ran a search earlier and it listed vacancies
> **When** the job seeker runs a search that reads some of those vacancies again
> **Then** only vacancies not shown in any earlier search are listed, the coverage report says how many already seen were skipped, and when nothing is new the system says there are no new vacancies together with the read and skipped counts
>
> — `spec.md §5, AC-16, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `test/e2e/failure-modes.test.ts`: through `runSearch` and `renderDocument`, every failure mode — the four source stops, the four service-level judge failures, an unexpected error, an unusable store, a failing print — asserting the coverage report exists, its buckets add up to `Read`, `RUN FAILED` appears, and the exit status (QG-1)
- [ ] `test/e2e/seen-memory.test.ts` with the real SQLite store in memory: two runs with the same details list 0 vacancies twice; a repost under a new job number is skipped and counted; show everything lists them again; a vacancy dropped earlier appears as new once the filter is widened (QG-3)
- [ ] `test/e2e/limit.test.ts`: a call-counting fake judge never sees more than the limit (limits 1 and 30); the leftovers are judged on the next run (QG-2, AC-22)
- [ ] `test/e2e/confidentiality.test.ts`: a sentinel CV text and a sentinel key across success and every failure mode never appear in stdout, stderr or a dump of the database (QG-5)
- [ ] `test/e2e/fixtures-run.test.ts`: one whole run with the real LinkedIn parsers over the T9 fixtures, served by a fake `fetch`, with `FakeClock`, `FakeJudge` and an in-memory store
- [ ] A guard that fails any test that calls the real `fetch` or opens a real Anthropic client — no test touches the network

## Edge cases

| Case | Behaviour |
|---|---|
| Every source stop kind | reaches the report and fails the run |
| Second identical run | lists 0 vacancies that the first run listed |
| Same company and title under a new job number | skipped and counted as a repost, not listed |
| Limit of 1 | exactly one judge call |
| A failure mode that produces no CV or key text of its own | the sentinels are still absent — including from the database |

## Definition of Done

- [ ] the five e2e test files pass offline with no network
- [ ] QG-1, QG-2, QG-3 and QG-5 each have an automated test named after them
- [ ] `npm run lint` and `npm run build` clean (the per-task gate)
