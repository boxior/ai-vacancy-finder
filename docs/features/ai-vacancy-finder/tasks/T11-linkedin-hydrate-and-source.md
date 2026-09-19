---
id: T11
title: "Parse LinkedIn detail pages, assemble the LinkedIn source and register it"
layer: "infra"
deps: ["T4", "T7", "T9", "T10"]
blocks: ["T19"]
acs: ["AC-08", "AC-13"]
files_hint: ["src/sources/linkedin/detail.ts", "src/sources/linkedin/index.ts", "src/sources/index.ts", "test/sources/linkedin-detail.test.ts"]
owner: "Serhii Lyzun"
estimate: "M"
context_budget: "M"
status: "todo"
---

<!-- To the executing agent: work from what is inlined here. If a slice is insufficient, ambiguous,
or contradicts the code in front of you, open the named file for the full text and follow that.
Do not invent the missing part. Every inline is a snapshot with a provenance signature; the source wins. -->

# T11 — Parse LinkedIn detail pages, assemble the LinkedIn source and register it

## Place in the sequence

- **Blocked by:** T4 — Define the three seam interfaces with their typed failures, the test fakes, and fix the fail-loudly wording, T7 — Build the shared polite HTTP client: pace, back-off and typed refusals, T9 — Save real public LinkedIn pages as fixtures and record what they show, T10 — Parse LinkedIn results pages into cards and list them with typed stops · **Blocks:** T19 — Wire the adapters in src/cli.ts and set the output streams and exit status · **Wave:** 6, its last dependency, T10, sits in wave 5.
- **Lane:** Same folder as T10 but different files; serialized after it by the dependency (it assembles T10's list into the source).

## Why (user story)

> **As a** Job seeker
> **I want** to run a search with my position, salary range, posted-since date, location or remote, and CV
> **So that** I get the relevant public vacancies without visiting sites by hand
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task fills in a vacancy's full description, pay and cut-off sign, and completes the LinkedIn source so the pipeline can list and hydrate it through the seam.

## Inlined context

> **Chosen:** Option 1. A repeat run over 100 already-shown vacancies costs a few list requests instead of 100 detail requests (about 100 s at the pace limit, and far less traffic), and the 5-minute budget holds on a first run over hundreds of candidates because only vacancies that will be judged are hydrated.
>
> […]
>
> 1. **Two-phase, lazy hydrate** — the seam has `list(search)` returning cards and `hydrate(card)` returning the full vacancy; the pipeline drops, de-duplicates and orders on cards, then hydrates and judges one vacancy at a time until the judging limit is filled.
>
> — `adr/0001 §Decision outcome, chosen option and option 1, abridged` · full text: [adr/0001](../adr/0001-read-sources-in-two-phases-hydrating-lazily.md)

> A vacancy also carries a partial-description flag, set only by the source when the page itself shows a sign that the text is cut off (a "show more" marker, a cut-off, a sign-in gate over the text) and never guessed from the length of the text
>
> — `sad.md §5, «Shape of the shared vacancy», the partial-description flag, abridged` · full text: [sad.md](../sad.md)

> Note over Sources: sets the partial-description flag only when the page itself shows a sign such as a show more marker, a cut-off or a sign-in gate over the text, never from the length of the text
>
> — `sad.md §6, «Critical flow 5», where the flag is set, verbatim` · full text: [sad.md](../sad.md)

> - Pay in another currency or period: a stated pay is compared with the salary range only when its currency and its period (a year) match the range's; otherwise the vacancy is kept and tagged "pay not comparable". There is no currency conversion and no month-to-year or hour-to-year guessing.
>
> — `sad.md §2, product decisions, pay in another currency or period, verbatim` · full text: [sad.md](../sad.md)

> **Vacancy source** (`src/sources/<site>/`) — one folder per site, returns the shared vacancy shape (`src/domain/`) or a typed error. Register new sources in `src/sources/index.ts`.
>
> — `CLAUDE.md §The three seams, Vacancy source, verbatim` · full text: [CLAUDE.md](../../../../CLAUDE.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full ([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) · [cli.md](../contracts/cli.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-08 — domain invariant

> **Given** a vacancy page itself shows a sign that only part of the job description is shown (for example a "show more" marker, a cut-off, or a sign-in gate over the text); the tool never guesses partiality from the length of the text
> **When** the vacancy is judged
> **Then** its line says the fit is based on a partial description, because a fit is never presented as more certain than the text it rests on
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)

### AC-13 — happy path

> **Given** one vacancy states a salary that overlaps the salary range, even partly, and another states a salary entirely below or entirely above it (a single stated figure counts as a range of zero width, "from X" as X and up, "up to X" as zero to X)
> **When** the filters run
> **Then** the first is kept and the second is dropped and counted in the coverage report as dropped for salary
>
> — `spec.md §5, AC-13, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `src/sources/linkedin/detail.ts`: `parseDetailPage(html, card)` with `cheerio` → the card filled in: `description` as plain text; `partialDescription` true only when the page itself shows a sign seen in the fixtures (a 'show more' marker, a cut-off, a sign-in gate over the text); `salary` {min, max, currency, period} exactly as stated when the page shows pay; fields the card lacked (for example a date) filled from the page, never overwriting what the card gave
- [ ] A sign-in wall over the whole detail page → `hydrate` returns `{ stop: blocked }`; an unreadable page → `{ stop: failed }`
- [ ] `src/sources/linkedin/index.ts`: `createLinkedInSource({ clock, fetch })` implementing `VacancySource` (T4) with `name: 'linkedin'` — `list` uses T10's `listCards`, `hydrate` fetches the detail page through the source's own client and parses it
- [ ] `src/sources/index.ts`: the registry of sources (name → factory); `cli.ts` wires from it in T19
- [ ] `test/sources/linkedin-detail.test.ts` over the fixtures

## Edge cases

| Case | Behaviour |
|---|---|
| Page shows a 'show more' marker, a cut-off or a sign-in gate over the text | `partialDescription` is true (AC-08) |
| A short description with no such sign | `partialDescription` stays false — never guessed from the length of the text |
| Pay stated as a range with a currency and a period | parsed into `Salary` so T2 can compare it |
| Pay stated monthly, hourly or in another currency | kept as stated, not converted; T2 tags it `pay not comparable` |
| Pay text that cannot be parsed | `salary` undefined, so the vacancy is tagged `salary not listed` — record this reading in the PR |
| The detail page is a sign-in wall | `hydrate` returns `blocked`; the client's stopped state (T7) refuses the rest without waiting |

## Definition of Done

- [ ] detail-parser tests over the saved fixtures pass: description, pay, cut-off sign, no sign, blocked, unreadable
- [ ] the LinkedIn source satisfies `VacancySource` and is listed in `src/sources/index.ts`
- [ ] `npm run build` and lint green
- [ ] `npm run lint` and `npm run build` clean (the per-task gate)
