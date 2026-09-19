---
id: T14
title: "Handle source stops and partial reads in runSearch"
layer: "app"
deps: ["T13"]
blocks: ["T15"]
acs: ["AC-04", "AC-11", "AC-12", "AC-23"]
files_hint: ["src/search/run-search.ts", "test/search/run-search-stops.test.ts"]
owner: "Serhii Lyzun"
estimate: "M"
context_budget: "M"
status: "todo"
---

<!-- To the executing agent: work from what is inlined here. If a slice is insufficient, ambiguous,
or contradicts the code in front of you, open the named file for the full text and follow that.
Do not invent the missing part. Every inline is a snapshot with a provenance signature; the source wins. -->

# T14 — Handle source stops and partial reads in runSearch

## Place in the sequence

- **Blocked by:** T13 — Implement runSearch: list, classify, hydrate and judge under the limit, present, mark seen · **Blocks:** T15 — Handle judge failures, unexpected errors, an unusable memory and a failed print in runSearch · **Wave:** 6, its last dependency, T13, sits in wave 5.
- **Lane:** Shares `src/search/run-search.ts` with T13 and T15 — serialized.

## Why (user story)

> **As a** Job seeker
> **I want** every run to end with a coverage report and a loud warning when a source returned nothing or only part
> **So that** a quiet or partial read never looks like "no jobs for you"
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task makes a blocked, throttled, failed or empty source, or a too-small read, show up in the result as a loud, typed cause instead of a quiet empty list.

## Inlined context

> **Chosen:** Option 1. The partial result and the cause travel in one value, so AC-23 needs no special path, and the compiler forces every stop kind to be handled.
>
> — `adr/0002 §Decision outcome, chosen option, verbatim` · full text: [adr/0002](../adr/0002-return-source-failures-as-values-alongside-partial-results.md)

> Once a source has stopped, the shared HTTP client refuses further requests to it without waiting, so vacancies not yet hydrated are reported as not judged with the source's cause.
> A stop during the listing phase therefore judges nothing from that source and the run is still reported as failed with the coverage report.
>
> — `sad.md §6, runtime view intro, a stopped source, abridged` · full text: [sad.md](../sad.md)

> Note over Search: cards already read are counted and each becomes not judged with the stop cause, nothing more is hydrated or judged from this source
>
> […]
>
> Note over Search,Store: nothing was shown, so nothing is marked seen
>
> […]
>
> Note over Search: this and every unreached candidate become not judged with cause throttled
>
> — `sad.md §6, «Critical flow 4» and «Critical flow 2», what Search does, abridged` · full text: [sad.md](../sad.md)

> **Fail loudly.** A source that fails or returns nothing raises a typed error that the coverage report shows. Never swallow an error; never print an empty list without its coverage line.
>
> — `CLAUDE.md §Rules, Fail loudly, verbatim` · full text: [CLAUDE.md](../../../../CLAUDE.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full ([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) · [cli.md](../contracts/cli.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface of its own; the printed texts belong to T17.

> | Trigger | Text |
> |---|---|
> | A source stop (AC-04, AC-11, AC-23) | `WARNING: source <name> was <blocked | throttled | failed | empty>: <detail>. <n> vacancies were not read or not judged because of it.` |
> | A partial read (AC-12) | `WARNING: partial read from <name>: read <k> of <e> expected.` (does not fail the run) |
>
> — `contracts/cli.md §5.2, Loud warnings, source stop and partial read, verbatim` · full text: [cli.md](../contracts/cli.md)

## Acceptance criteria

### AC-04 — authorization

> **Given** the source shows a sign-in page instead of its public vacancy pages
> **When** the search runs
> **Then** the system does not sign in with any account, reports the source as blocked in the coverage report with a loud warning, lists no vacancies from it, and marks the run as failed (AC-11)
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)

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

### AC-23 — error

> **Given** the source slows down or refuses requests because it is being asked too often
> **When** the search runs
> **Then** the system slows its requests down and, once the retry allowance of §6 is used up, reports the source as throttled in the coverage report with a loud warning, marks the run as failed (AC-11), lists only what was read before, and does not retry in a tight loop
>
> — `spec.md §5, AC-23, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] In `src/search/run-search.ts`: when `list` returns a `stop`, every card read before it becomes `not_judged` with `source.<kind>` (blocked, throttled, failed); nothing is hydrated or judged; `empty` reads 0; the run is failed; nothing is marked seen
- [ ] When `hydrate` returns a `stop`, the candidate being hydrated and every unreached candidate become `not_judged` with `source.<kind>`; vacancies judged before it stay listed and are marked seen after presenting; the run is failed; no further `hydrate` call is made
- [ ] Partial read: when the source states an `expectedCount` and fewer than half of it was read, record `partialRead { read, expected }` in the result and carry on; this alone does not fail the run
- [ ] Put the stop kind and detail in the result so T17 can print the warning and the `RUN FAILED` line; `present` is still called for every stop
- [ ] `test/search/run-search-stops.test.ts` with `FakeSource`, including one test that iterates over every stop kind and asserts it reaches the result

## Edge cases

| Case | Behaviour |
|---|---|
| Blocked at listing with 7 cards read | 7 × `not_judged: source.blocked`, nothing judged, run failed, nothing marked seen (AC-04) |
| Throttled while hydrating the 4th candidate | 3 judged and listed, then marked seen; the 4th and every unreached candidate `not_judged: source.throttled`; run failed (AC-23) |
| `empty` | read 0, run failed, result presented — never a bare empty list (AC-11) |
| Read is exactly half of the expected count | not a partial read — the warning needs strictly less than half (AC-12) |
| Source states no expected count | no partial-read check |
| A sign-in page on a detail page | hydrate-phase `blocked`: same handling as any other hydrate stop |

## Definition of Done

- [ ] tests cover blocked, failed and empty at listing, throttled mid-hydration, the partial-read boundary, and all stop kinds reaching the result
- [ ] no path ends a stopped run without presenting a result
- [ ] every Hard Rule inlined above still holds
- [ ] `npm run lint` and `npm run build` clean (the per-task gate)
