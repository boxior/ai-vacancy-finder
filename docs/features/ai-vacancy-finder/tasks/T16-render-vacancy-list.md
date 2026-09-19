---
id: T16
title: "Render the fit-sorted vacancy list with its tags and marks"
layer: "app"
deps: ["T1", "T3"]
blocks: ["T17"]
acs: ["AC-06", "AC-08", "AC-09"]
files_hint: ["src/report/list.ts", "test/report/list.test.ts"]
owner: "Serhii Lyzun"
estimate: "S"
context_budget: "M"
status: "todo"
---

<!-- To the executing agent: work from what is inlined here. If a slice is insufficient, ambiguous,
or contradicts the code in front of you, open the named file for the full text and follow that.
Do not invent the missing part. Every inline is a snapshot with a provenance signature; the source wins. -->

# T16 — Render the fit-sorted vacancy list with its tags and marks

## Place in the sequence

- **Blocked by:** T1 — Define the vacancy shape, the search input type, the clock and the repost fingerprint, T3 — Define the disposition set, the run result and the accounting check · **Blocks:** T17 — Render the coverage report, the loud warnings and the whole result document · **Wave:** 3, its last dependency, T3, sits in wave 2.
- **Lane:** Own lane.

## Why (user story)

> **As a** Job seeker
> **I want** each new vacancy judged against my CV and listed with its apply link, fit and a one-line reason
> **So that** I open the best matches first and know why they were ranked there
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task prints each judged vacancy with its apply link, fit and one-line reason, best first, so the job seeker opens the strongest matches first and knows why.

## Inlined context

> 7. **Render** — the list (untagged vacancies by fit, then tagged ones by fit), the loud warnings and the coverage report, all derived from the dispositions.
>
> — `sad.md §4, «How a run flows» step 7, verbatim` · full text: [sad.md](../sad.md)

> the report adds "fit based on a partial description" to that vacancy's line (AC-08).
>
> — `sad.md §5, the partial-description line, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full ([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) · [cli.md](../contracts/cli.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface of its own; the printed format is the CLI contract's.

> **Vacancy list.** Judged vacancies only. Two groups: **untagged** vacancies first, then **tagged** ones under a `Tagged vacancies` heading (AC-06, AC-14). Within a group, ordered by fit, best first; equal fits keep judging order (newest first, and with `--show-everything` new ones before those shown before). A vacancy that was judged is listed however low its fit (AC-06).
> Each vacancy is one entry:
> ```
> [<fit>/10] <title> — <company>
>   <apply link>
>   <one-line reason>
>   <marks and tags, when any>
> ```
> - `fit` is a whole number 1–10; `reason` is one line.
> - **Tags** (a vacancy with at least one is in the tagged group; all its tags are shown): `salary not listed`, `date approximate`, `date not listed`, `pay not comparable`. `pay not comparable` is the tag for a stated pay whose currency or period differs from the range's (SAD §2).
> - **Marks** (shown on the entry, never place a vacancy in the tagged group): `seen before` (a vacancy shown in an earlier search, `--show-everything` only), `repost` (same company and title as one shown before, `--show-everything` only), `fit based on a partial description` (AC-08).
> - A vacancy whose text tried to instruct the judge (AC-09) ends its reason line with `(vacancy text contained instructions)`.
>
> — `contracts/cli.md §5.2, «Vacancy list», verbatim` · full text: [cli.md](../contracts/cli.md)

## Acceptance criteria

### AC-06 — happy path

> **Given** several new vacancies passed the filters
> **When** the search completes
> **Then** each is listed with its apply link, its fit (a whole number from 1 to 10) and a one-line reason, ordered from best fit to worst in two groups: untagged vacancies first, then all vacancies carrying at least one tag ("salary not listed", "date approximate", "date not listed", and the tag for pay that cannot be compared once §8 settles it), each group in its own fit order, with every tag of a vacancy shown on its line; fit never removes a vacancy, so every vacancy that passed the filters and was judged is listed, however low its fit
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)

### AC-08 — domain invariant

> **Given** a vacancy page itself shows a sign that only part of the job description is shown (for example a "show more" marker, a cut-off, or a sign-in gate over the text); the tool never guesses partiality from the length of the text
> **When** the vacancy is judged
> **Then** its line says the fit is based on a partial description, because a fit is never presented as more certain than the text it rests on
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)

### AC-09 — domain invariant

> **Given** a vacancy's text tries to instruct the judgment, for example by asking for the top fit
> **When** the vacancy is judged
> **Then** the fit rests on the match with the CV alone, and the judge, which is told to treat vacancy text as data, reports whether the text contained instructions; when it reports so, the reason line flags the vacancy as containing instructions, because vacancy text is data and never instructions
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `src/report/list.ts`: `renderList(judged): string` — pure, no I/O; input is the judged records (vacancy, judgment, tags, marks) in judging order
- [ ] Two groups: untagged first, then a `Tagged vacancies` heading and the tagged ones (printed only when that group is non-empty); within a group sort by fit, best first, stable for ties
- [ ] Entry: `[<fit>/10] <title> — <company>`, the apply link, the reason on one line, then one line of tags and marks when any — tags first, then marks (cli.md shows a single line and does not order them; record the choice)
- [ ] Reason ends with `(vacancy text contained instructions)` when the judge flagged it (AC-09); the mark `fit based on a partial description` when the vacancy's flag is set (AC-08); `seen before` and `repost` marks never move a vacancy into the tagged group
- [ ] `test/report/list.test.ts`

## Edge cases

| Case | Behaviour |
|---|---|
| No judged vacancies | returns an empty string — T17 prints the no-list message |
| Tagged and untagged vacancies | untagged first; the heading appears only when tagged ones exist |
| A vacancy with only marks (seen before, repost, partial) | stays in the untagged group |
| Fit 1 | still listed — fit never removes a vacancy (AC-06) |
| Equal fits | keep the judging order |
| Reason with a line break | collapsed to one line |
| Several tags on one vacancy | every tag is shown on its line |

## Definition of Done

- [ ] tests cover grouping, tie order, all tags shown, marks not moving a vacancy, a low fit still listed, the two suffixes
- [ ] no CV text can reach the output — the renderer never receives it
- [ ] `npm run lint` and `npm run build` clean (the per-task gate)
