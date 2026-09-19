---
id: T12
title: "Classify cards: drop, skip seen and reposts, and order the candidates"
layer: "app"
deps: ["T1", "T2", "T3", "T4"]
blocks: ["T13"]
acs: ["AC-15", "AC-16", "AC-17", "AC-18", "AC-19", "AC-20"]
files_hint: ["src/search/classify.ts", "test/search/classify.test.ts"]
owner: "Serhii Lyzun"
estimate: "M"
context_budget: "M"
status: "todo"
---

<!-- To the executing agent: work from what is inlined here. If a slice is insufficient, ambiguous,
or contradicts the code in front of you, open the named file for the full text and follow that.
Do not invent the missing part. Every inline is a snapshot with a provenance signature; the source wins. -->

# T12 — Classify cards: drop, skip seen and reposts, and order the candidates

## Place in the sequence

- **Blocked by:** T1 — Define the vacancy shape, the search input type, the clock and the repost fingerprint, T2 — Implement the date and salary filters and their tags as pure rules, T3 — Define the disposition set, the run result and the accounting check, T4 — Define the three seam interfaces with their typed failures, the test fakes, and fix the fail-loudly wording · **Blocks:** T13 — Implement runSearch: list, classify, hydrate and judge under the limit, present, mark seen · **Wave:** 4, its last dependency, T4, sits in wave 3.
- **Lane:** Own lane.

## Why (user story)

> **As a** Job seeker
> **I want** later searches to list only vacancies I have not been shown, with a way to show everything
> **So that** I do not re-read what I already saw
>
> — `spec.md §4, US-05, verbatim` · full text: [spec.md](../spec.md)

This task decides, from the cards alone, which vacancies are dropped, skipped as already seen or as reposts, and which go on to be judged in what order.

## Inlined context

> 3. **Classify on cards** — drop what is certainly older than the posted-since date, skip vacancies already shown (by source name plus job number) and reposts (by company plus title) unless "show everything" is on, and check salary when the card states it. With "show everything" on, seen vacancies and reposts stay candidates, marked "seen before" or "repost", so that a wrongly skipped opening can always be found (AC-17, AC-20); a search without it states how many it skipped as reposts. Each read vacancy gets its disposition in the AC-10 order (ADR 0003).
> 4. **Order** — candidates go newest first; with "show everything", new ones first and then all those recognised as shown before (seen or repost), newest first; they are judged again and count toward the limit (AC-17, AC-21).
>
> — `sad.md §4, «How a run flows» steps 3–4, verbatim` · full text: [sad.md](../sad.md)

> A vacancy counts as seen only once it has been shown, so the seen memory never hides a vacancy that was dropped, not judged or lost to a failure.
>
> — `sad.md §4, seen only when shown, verbatim` · full text: [sad.md](../sad.md)

> each counted in exactly one of these, checked in that order, so that they add up to the read count
>
> — `spec.md §5, AC-10, the order of the buckets, abridged` · full text: [spec.md](../spec.md)

> - Buckets are assigned in the AC-10 order using what is known at each step: a vacancy whose salary is only on its detail page is checked for salary only if it is hydrated, so an already-seen one is counted as seen, not as dropped for salary.
>
> — `adr/0001 §Consequences, negative, the order of checks on cards, verbatim` · full text: [adr/0001](../adr/0001-read-sources-in-two-phases-hydrating-lazily.md)

> Note over Search: two cards read in this same search are never reposts of each other
>
> […]
>
> Note over Search: stays a candidate, including one that was dropped, not judged or lost to a failure in an earlier search
>
> — `sad.md §6, «Critical flow 7», abridged` · full text: [sad.md](../sad.md)

> **Identity.** A vacancy is the source name plus the site's own job number; a company-plus-title fingerprint catches reposts.
>
> — `CLAUDE.md §Rules, Identity, verbatim` · full text: [CLAUDE.md](../../../../CLAUDE.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full ([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) · [cli.md](../contracts/cli.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-15 — domain invariant

> **Given** a vacancy shows only a rough age, such as "two weeks ago", that could fall inside or outside the posted-since window
> **When** the filters run
> **Then** it is kept, tagged "date approximate" and shown below untagged vacancies, while a vacancy whose age certainly falls before the posted-since date is dropped and counted in the coverage report
>
> — `spec.md §5, AC-15, verbatim` · full text: [spec.md](../spec.md)

### AC-16 — happy path

> **Given** the job seeker ran a search earlier and it listed vacancies
> **When** the job seeker runs a search that reads some of those vacancies again
> **Then** only vacancies not shown in any earlier search are listed, the coverage report says how many already seen were skipped, and when nothing is new the system says there are no new vacancies together with the read and skipped counts
>
> — `spec.md §5, AC-16, verbatim` · full text: [spec.md](../spec.md)

### AC-17 — happy path

> **Given** the job seeker asks to show everything
> **When** the search runs
> **Then** all vacancies that passed the filters are listed, including those shown before, each marked as seen before; vacancies shown before are judged again like any other and count toward the judging limit, new vacancies first and then those shown before newest first, and any left over the limit are reported as not judged because of the limit
>
> — `spec.md §5, AC-17, verbatim` · full text: [spec.md](../spec.md)

### AC-18 — cross-context

> **Given** a vacancy was dropped for salary or date in an earlier search
> **When** the job seeker widens the filter and searches again
> **Then** that vacancy appears as new, because only vacancies that were shown count as seen
>
> — `spec.md §5, AC-18, verbatim` · full text: [spec.md](../spec.md)

### AC-19 — happy path

> **Given** a vacancy from a company with a given title was shown in an earlier search
> **When** the same company posts the same title again under a new job number or date (company and title are compared after lowercasing and collapsing repeated spaces, and nothing else is normalised)
> **Then** it is not listed as new and the coverage report counts it as a repost; two such vacancies read in the same search are not reposts of each other and both are listed
>
> — `spec.md §5, AC-19, verbatim` · full text: [spec.md](../spec.md)

### AC-20 — domain invariant

> **Given** reposts were skipped in a search
> **When** the job seeker asks to show everything
> **Then** those reposts are listed too, because every search states how many were skipped as reposts so that a wrongly skipped opening can always be found
>
> — `spec.md §5, AC-20, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `src/search/classify.ts`: `classifyCards({ cards, input, store, clock })` → `{ settled, candidates }` — `settled` are records with their final disposition, `candidates` are ordered and carry their tags and marks; one `store.findShown(ids)` and one `store.findFingerprints(fps)` call before classification, so the lookups see the memory as it was before this search
- [ ] Per card, in AC-10 order, first match wins: date verdict (T2) → `dropped_date`; salary verdict (T2) when the card states pay → `dropped_salary`; identity found in memory → `seen`; fingerprint found in memory → `repost`; otherwise a candidate
- [ ] Show everything (`input.showEverything`): `seen` and `repost` do not settle — they become candidates marked `seenBefore` / `repost`; date and salary drops still apply
- [ ] Order: newest first by `bestEstimate` (T1), undated last, ties in card order; with show everything, new candidates first and then those shown before (seen or repost), newest first within each group
- [ ] Candidates keep the tags from the card-level verdicts (`date approximate`, `date not listed`, and the salary tags when the card states pay)
- [ ] `test/search/classify.test.ts` with `FakeSeenStore` and the builders from T4

## Edge cases

| Case | Behaviour |
|---|---|
| Same job number as a shown vacancy, and the same company and title | `seen`, not `repost` — seen is checked first (AC-10 order) |
| New job number, company and title of a shown vacancy | `repost` |
| Two cards in this search with the same company and title, neither shown before | both candidates — reposts are only against earlier searches (AC-19) |
| A vacancy dropped for salary or date earlier (no row in memory) | appears as new (AC-18) |
| Show everything | `seen` and `repost` become marked candidates, ordered after the new ones (AC-17, AC-20) |
| Card states pay outside the range | `dropped_salary` before the seen and repost checks |
| Pay is only on the detail page | not checked here — T13 checks it after hydration; a card that is already seen counts as `seen` (ADR 0001) |
| No candidates left | an empty list, not an error |

## Definition of Done

- [ ] tests cover each row of the edge table and the two orderings and pass
- [ ] the function does no I/O beyond the two store calls
- [ ] every Hard Rule inlined above still holds
- [ ] `npm run lint` and `npm run build` clean (the per-task gate)
