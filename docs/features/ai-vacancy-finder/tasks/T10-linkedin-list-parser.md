---
id: T10
title: "Parse LinkedIn results pages into cards and list them with typed stops"
layer: "infra"
deps: ["T1", "T4", "T7", "T9"]
blocks: ["T11"]
acs: ["AC-04", "AC-12", "AC-15"]
files_hint: ["src/sources/linkedin/list.ts", "test/sources/linkedin-list.test.ts"]
owner: "Serhii Lyzun"
estimate: "M"
context_budget: "M"
status: "todo"
---

<!-- To the executing agent: work from what is inlined here. If a slice is insufficient, ambiguous,
or contradicts the code in front of you, open the named file for the full text and follow that.
Do not invent the missing part. Every inline is a snapshot with a provenance signature; the source wins. -->

# T10 — Parse LinkedIn results pages into cards and list them with typed stops

## Place in the sequence

- **Blocked by:** T1 — Define the vacancy shape, the search input type, the clock and the repost fingerprint, T4 — Define the three seam interfaces with their typed failures, the test fakes, and fix the fail-loudly wording, T7 — Build the shared polite HTTP client: pace, back-off and typed refusals, T9 — Save real public LinkedIn pages as fixtures and record what they show · **Blocks:** T11 — Parse LinkedIn detail pages, assemble the LinkedIn source and register it · **Wave:** 5, its last dependency, T7, sits in wave 4.
- **Lane:** Own lane.

## Why (user story)

> **As a** Job seeker
> **I want** to run a search with my position, salary range, posted-since date, location or remote, and CV
> **So that** I get the relevant public vacancies without visiting sites by hand
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task reads the public results pages without signing in and turns them into cards, so the run has vacancies to filter, or a loud reason why it has none.

## Inlined context

> **Chosen:** Option 1. A repeat run over 100 already-shown vacancies costs a few list requests instead of 100 detail requests (about 100 s at the pace limit, and far less traffic), and the 5-minute budget holds on a first run over hundreds of candidates because only vacancies that will be judged are hydrated.
>
> — `adr/0001 §Decision outcome, chosen option, verbatim` · full text: [adr/0001](../adr/0001-read-sources-in-two-phases-hydrating-lazily.md)

> **Chosen:** Option 1. AC-15 and AC-15b become interval arithmetic (drop only when even the latest possible date is before the window; tag approximate when the range straddles it), and the code that skips or orders vacancies does not care whether a vacancy has been hydrated.
>
> — `adr/0007 §Decision outcome, chosen option, verbatim` · full text: [adr/0007](../adr/0007-model-a-posted-date-as-exact-range-or-unknown.md)

> LinkedIn-->>Sources: sign-in page
> Note over Sources: never signs in with any account
> Sources-->>Search: typed stop blocked, with any cards read before it
>
> […]
>
> Sources-->>Search: typed stop failed, with any cards read before it
>
> […]
>
> Sources-->>Search: typed stop empty
>
> […]
>
> Note over Search: the run continues as in flow 1 with the cards it has and records a partial read
>
> — `sad.md §6, «Critical flow 4», what a source does while listing, abridged` · full text: [sad.md](../sad.md)

> - Source shows a sign-in page: reported as blocked, never bypassed.
>
> — `spec.md §6.1, abuse case, sign-in page, verbatim` · full text: [spec.md](../spec.md)

> **Offline tests.** Sources are tested against saved real pages in `test/fixtures/`, never the live site. The fit judge is tested against a fake. No test touches the network.
>
> — `CLAUDE.md §Rules, Offline tests, verbatim` · full text: [CLAUDE.md](../../../../CLAUDE.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full ([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) · [cli.md](../contracts/cli.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface of its own; the stop kinds are the ones the CLI contract fixes.

> | Code | Meaning | Fails the run | AC |
> |---|---|---|---|
> | `source.blocked` | A sign-in page instead of public results; never bypassed | yes | AC-04 |
> | `source.failed` | Error or unreadable page | yes | AC-11 |
> | `source.empty` | No vacancies at all | yes | AC-11 |
>
> — `contracts/cli.md §6.2, Source stops, abridged` · full text: [cli.md](../contracts/cli.md)

## Acceptance criteria

### AC-04 — authorization

> **Given** the source shows a sign-in page instead of its public vacancy pages
> **When** the search runs
> **Then** the system does not sign in with any account, reports the source as blocked in the coverage report with a loud warning, lists no vacancies from it, and marks the run as failed (AC-11)
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)

### AC-12 — cross-context

> **Given** the source states how many vacancies match the search
> **When** this search reads less than half of that number
> **Then** the coverage report warns of a partial read and shows how many were read out of how many were expected; this warning alone does not mark the run as failed
>
> — `spec.md §5, AC-12, verbatim` · full text: [spec.md](../spec.md)

### AC-15 — domain invariant

> **Given** a vacancy shows only a rough age, such as "two weeks ago", that could fall inside or outside the posted-since window
> **When** the filters run
> **Then** it is kept, tagged "date approximate" and shown below untagged vacancies, while a vacancy whose age certainly falls before the posted-since date is dropped and counted in the coverage report
>
> — `spec.md §5, AC-15, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Read `test/fixtures/linkedin/README.md` (T9) first: everything below follows what the saved pages show, and an unobserved property falls back to the design's worst case
- [ ] `src/sources/linkedin/list.ts`: `buildSearchUrl(query, page)` from position, location and remote-only, in the form the fixtures show; `parseResultsPage(html)` with `cheerio` → `{ cards, expectedCount?, signInWall }` — each card carries job number, title and company (trimmed), the public apply link, a `PostedDate` and a `Salary` when the card states one
- [ ] Rough age to `PostedDate` (ADR 0007): 'N days/weeks/months ago' becomes a range using the site's real granularity from the README; an exact date becomes `exact`; nothing shown becomes `unknown`
- [ ] `listCards(http, query, { maxPages })`: page through the shared client (T7) until a page adds no new cards, the expected count is reached, or `maxPages` — a constant the spec does not fix; pick one, print it in the README and the PR (the report shows read versus expected, so a cap is visible)
- [ ] Map to stops: a sign-in page → `blocked` with the cards read before it; an unreadable page or a client `failed` → `failed` with the cards read before it; a first page with no cards → `empty`; a client stop passes through with the cards read before it
- [ ] The adapter's classifier for T7 recognises the sign-in wall from the fixtures; nothing anywhere signs in, keeps cookies or sends credentials
- [ ] `test/sources/linkedin-list.test.ts`: fixtures served through the real client with `FakeClock` and a fake `fetch`

## Edge cases

| Case | Behaviour |
|---|---|
| Sign-in page instead of results | stop `blocked`, cards read before it kept, no login attempt (AC-04) |
| A page whose structure is not recognised | stop `failed` naming the page — never an empty list without a stop |
| First page has no cards | stop `empty` |
| Site states 120 matches and 45 were read | `expectedCount` 120 is returned; the partial-read decision belongs to T14 |
| Site states no match count | `expectedCount` is undefined and no partial-read check happens |
| Card shows no date or age | `PostedDate` `unknown`; AC-15b handling is downstream |
| Card has no job number | not specified — it cannot be identified, so report the page as `failed` (loud) rather than dropping it silently; note it in the PR |
| The same job number on two pages | kept once; the read count does not double-count it |
| Pagination returns the same page again | paging stops when a page adds no new cards |

## Definition of Done

- [ ] parser and `listCards` tests over the saved fixtures pass: cards, rough ages, expected count, blocked, failed, empty
- [ ] no code path signs in or carries credentials
- [ ] `npm run lint` and `npm run build` clean (the per-task gate)
