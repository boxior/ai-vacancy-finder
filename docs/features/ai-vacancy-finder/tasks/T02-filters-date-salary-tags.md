---
id: T2
title: "Implement the date and salary filters and their tags as pure rules"
layer: "domain"
deps: ["T1"]
blocks: ["T12", "T13"]
acs: ["AC-13", "AC-14", "AC-15", "AC-15b"]
files_hint: ["src/domain/filters.ts", "test/domain/filters.test.ts"]
owner: "Serhii Lyzun"
estimate: "M"
context_budget: "M"
status: "todo"
---

<!-- To the executing agent: work from what is inlined here. If a slice is insufficient, ambiguous,
or contradicts the code in front of you, open the named file for the full text and follow that.
Do not invent the missing part. Every inline is a snapshot with a provenance signature; the source wins. -->

# T2 — Implement the date and salary filters and their tags as pure rules

## Place in the sequence

- **Blocked by:** T1 — Define the vacancy shape, the search input type, the clock and the repost fingerprint · **Blocks:** T12 — Classify cards: drop, skip seen and reposts, and order the candidates, T13 — Implement runSearch: list, classify, hydrate and judge under the limit, present, mark seen · **Wave:** 2, its last dependency, T1, sits in wave 1.
- **Lane:** Own lane.

## Why (user story)

> **As a** Job seeker
> **I want** vacancies outside my salary range or date window dropped, and those with unknown pay or date kept and tagged
> **So that** the list is short but no good vacancy disappears only because a site left something out
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task delivers the rules that drop a vacancy for a salary or date that is certainly outside the search, and keep-and-tag one whose pay or date is unknown or rough.

## Inlined context

> Decision override: a stated salary that overlaps the salary range even partly is kept — the repo rule says a stated salary outside the range is dropped, and this spec reads "outside" as entirely below or entirely above the range. Rationale: a good vacancy must not be lost to imprecision in a posted figure.
>
> — `spec.md §1, Decision override, verbatim` · full text: [spec.md](../spec.md)

> A vacancy is dropped for date only when even its latest possible date is before the posted-since date; a range that straddles that date is kept and tagged "date approximate"; an unknown date is tagged "date not listed"; ordering uses the middle of a range.
>
> — `sad.md §5, «Shape of the shared vacancy», date rule, verbatim` · full text: [sad.md](../sad.md)

> | Concept | Convention | Where defined |
> |---|---|---|
> | Salary comparison | An overlap with the salary range, even partial, is kept; a single figure is a range of zero width, "from X" is X and up, "up to X" is 0 to X. A stated pay is compared only when its currency and period match the range's; otherwise it is kept and tagged "pay not comparable". No conversion. | spec §1 decision override, AC-13, §2 |
>
> — `sad.md §8, «Salary comparison», verbatim` · full text: [sad.md](../sad.md)

> **Salary.** No stated salary → keep the vacancy, tag it "salary not listed", show it below confirmed ones. A stated salary outside the range → drop it.
>
> — `CLAUDE.md §Rules, Salary, verbatim` · full text: [CLAUDE.md](../../../../CLAUDE.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full ([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) · [cli.md](../contracts/cli.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface of its own; the tag wording below is printed output fixed by the CLI contract.

> - **Tags** (a vacancy with at least one is in the tagged group; all its tags are shown): `salary not listed`, `date approximate`, `date not listed`, `pay not comparable`. `pay not comparable` is the tag for a stated pay whose currency or period differs from the range's (SAD §2).
>
> — `contracts/cli.md §5.2, Vacancy list, Tags, verbatim` · full text: [cli.md](../contracts/cli.md)

## Acceptance criteria

### AC-13 — happy path

> **Given** one vacancy states a salary that overlaps the salary range, even partly, and another states a salary entirely below or entirely above it (a single stated figure counts as a range of zero width, "from X" as X and up, "up to X" as zero to X)
> **When** the filters run
> **Then** the first is kept and the second is dropped and counted in the coverage report as dropped for salary
>
> — `spec.md §5, AC-13, verbatim` · full text: [spec.md](../spec.md)

### AC-14 — domain invariant

> **Given** a vacancy states no salary
> **When** the filters run
> **Then** it is kept, tagged "salary not listed" and placed in the tagged group of AC-06, below untagged vacancies, because missing pay never drops a vacancy
>
> — `spec.md §5, AC-14, verbatim` · full text: [spec.md](../spec.md)

### AC-15 — domain invariant

> **Given** a vacancy shows only a rough age, such as "two weeks ago", that could fall inside or outside the posted-since window
> **When** the filters run
> **Then** it is kept, tagged "date approximate" and shown below untagged vacancies, while a vacancy whose age certainly falls before the posted-since date is dropped and counted in the coverage report
>
> — `spec.md §5, AC-15, verbatim` · full text: [spec.md](../spec.md)

### AC-15b — domain invariant

> **Given** a vacancy shows no posted date or age at all
> **When** the filters run
> **Then** it is kept, tagged "date not listed", placed in the tagged group of AC-06 and counted in the coverage report as kept without a stated date, because a missing date never drops a vacancy
>
> — `spec.md §5, AC-15b, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `src/domain/filters.ts`: `dateVerdict(postedDate, postedSince | undefined)` → `{ kind: 'drop' }` | `{ kind: 'keep', tag?: 'date approximate' | 'date not listed' }` — drop only when the latest possible date is before the window; a range that straddles it is kept with `date approximate`; `unknown` is kept with `date not listed`
- [ ] `src/domain/filters.ts`: `salaryVerdict(salary | undefined, range | undefined)` → drop | keep with `salary not listed` (no pay stated) | keep with `pay not comparable` (currency or period differs from the range's) | keep untagged — an overlap with the range, even partial, is kept
- [ ] Range arithmetic per AC-13: a single figure is a range of zero width, `from X` is X and up, `up to X` is 0 to X; the search range's period is always a year and an open bound is open-ended
- [ ] Export the four tag strings as a closed union so the report (T16) cannot misspell them
- [ ] `test/domain/filters.test.ts`: one case per row of the edge table below, using the builders from T4 where handy

## Edge cases

| Case | Behaviour |
|---|---|
| Single stated figure X | range [X, X]; kept when it lies inside the search range, dropped when outside |
| `from X` / `up to X` | [X, open end] / [0, X] |
| Stated pay touches the range end (pay max = range min) | overlap → kept (closed intervals) |
| Pay in another currency, or per month/hour | kept and tagged `pay not comparable`; never dropped, never converted |
| No pay stated | kept, tagged `salary not listed` (AC-14) |
| Search has no salary bounds | no salary filtering (an omitted filter does not filter, cli.md §2.1); AC-14 is silent on the tag then — apply it literally (no pay stated → tag) and say so in the PR |
| Exact date equal to posted-since | kept — dropped only when strictly before the window |
| Range entirely on or after posted-since | kept, untagged (certainly inside the window) |
| No posted-since given | no date drop; `date not listed` still applies to an unknown date; `date approximate` needs a window to straddle, so it is not applied — AC-15 is silent, record the reading in the PR |

## Definition of Done

- [ ] unit tests cover every row of the edge table and pass
- [ ] the functions are pure — no clock, no I/O (today is passed in by the caller)
- [ ] `npm run lint` and `npm run build` clean (the per-task gate)
