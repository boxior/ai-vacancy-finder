---
id: T1
title: "Define the vacancy shape, the search input type, the clock and the repost fingerprint"
layer: "domain"
deps: []
blocks: ["T2", "T3", "T4", "T6", "T7", "T8", "T10", "T12", "T16", "T18"]
acs: ["AC-19"]
files_hint: ["package.json", "package-lock.json", "src/domain/vacancy.ts", "src/domain/search-input.ts", "src/domain/clock.ts", "test/domain/vacancy.test.ts"]
owner: "Serhii Lyzun"
estimate: "M"
context_budget: "M"
status: "todo"
---

<!-- To the executing agent: work from what is inlined here. If a slice is insufficient, ambiguous,
or contradicts the code in front of you, open the named file for the full text and follow that.
Do not invent the missing part. Every inline is a snapshot with a provenance signature; the source wins. -->

# T1 — Define the vacancy shape, the search input type, the clock and the repost fingerprint

## Place in the sequence

- **Blocked by:** — · **Blocks:** T2 — Implement the date and salary filters and their tags as pure rules, T3 — Define the disposition set, the run result and the accounting check, T4 — Define the three seam interfaces with their typed failures, the test fakes, and fix the fail-loudly wording, T6 — Implement the SQLite seen-store and the opener that creates or refuses the database, T7 — Build the shared polite HTTP client: pace, back-off and typed refusals, T8 — Implement the Claude fit judge: rubric prompt, schema-checked answer, failure classes, T10 — Parse LinkedIn results pages into cards and list them with typed stops, T12 — Classify cards: drop, skip seen and reposts, and order the candidates, T16 — Render the fit-sorted vacancy list with its tags and marks, T18 — Implement preflight: argument parsing, input validation, CV, key and the contact notice · **Wave:** 1, no upstream task, so it starts in the first wave.
- **Lane:** Shares `src/domain/search-input.ts` with T18 (which adds the validation) — T18 waits for this task anyway. It is the only task that touches `package.json`, so the three planned libraries are added here once.

## Why (user story)

> **As a** Job seeker
> **I want** the same job posted again under a new date or number recognised as already seen
> **So that** it does not come back as new
>
> — `spec.md §4, US-06, verbatim` · full text: [spec.md](../spec.md)

This task fixes the one vacancy shape and the fingerprint that recognises the same job posted again, so a repost can be told from a new vacancy everywhere downstream.

## Inlined context

> One `Vacancy` type serves both a card and a hydrated vacancy; its description is empty until it is hydrated. A posted date is an exact date, a range (earliest and latest possible) or unknown.
>
> […]
>
> A salary is a minimum and maximum with a currency and a period. A vacancy also carries a partial-description flag, set only by the source when the page itself shows a sign that the text is cut off (a "show more" marker, a cut-off, a sign-in gate over the text) and never guessed from the length of the text
>
> — `sad.md §5, «Shape of the shared vacancy», abridged` · full text: [sad.md](../sad.md)

> **Chosen:** Option 1. AC-15 and AC-15b become interval arithmetic (drop only when even the latest possible date is before the window; tag approximate when the range straddles it), and the code that skips or orders vacancies does not care whether a vacancy has been hydrated.
>
> — `adr/0007 §Decision outcome, chosen option, verbatim` · full text: [adr/0007](../adr/0007-model-a-posted-date-as-exact-range-or-unknown.md)

> | Concept | Convention | Where defined |
> |---|---|---|
> | ID strategy | A vacancy is the source name plus the site's own job number. The repost fingerprint is company plus title, lowercased with repeated spaces collapsed and nothing else normalised. Two vacancies read in the same search are never reposts of each other. | repo ADR 0003, AC-19 |
> | Time and pace | An injected `Clock` (now, sleep) drives request pace, back-off, the run duration in the coverage report and "today" for the date rules; tests use a fake clock. | ADR 0006 |
>
> — `sad.md §8, «ID strategy» and «Time and pace», verbatim` · full text: [sad.md](../sad.md)

> Libraries the map plans but `package.json` does not list yet: `cheerio` (reading vacancy HTML), `zod` (the vacancy shape and validation of the AI's answer) and `@anthropic-ai/sdk` (used only in `src/matching/`). Everything else is built in: `fetch` for HTTP, `node:util` `parseArgs` for the command line.
>
> — `sad.md §2, Technical constraints, libraries, abridged` · full text: [sad.md](../sad.md)

> **Identity.** A vacancy is the source name plus the site's own job number; a company-plus-title fingerprint catches reposts.
>
> — `CLAUDE.md §Rules, Identity, verbatim` · full text: [CLAUDE.md](../../../../CLAUDE.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full ([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) · [cli.md](../contracts/cli.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

> | Column | Type | Constraints | Notes |
> |---|---|---|---|
> | `repost_fingerprint` | TEXT | NOT NULL, CHECK (length > 0) | Company plus title, each lowercased with repeated spaces collapsed and nothing else normalised (AC-19). Built only by a function in `src/domain/`; the database stores it as an opaque string. |
>
> — `data-model.md §Entities, table shown_vacancy, column repost_fingerprint, abridged` · full text: [data-model.md](../data-model.md)

Change: read-only here — this task builds the string the column stores; the table itself is T5.

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-19 — happy path

> **Given** a vacancy from a company with a given title was shown in an earlier search
> **When** the same company posts the same title again under a new job number or date (company and title are compared after lowercasing and collapsing repeated spaces, and nothing else is normalised)
> **Then** it is not listed as new and the coverage report counts it as a repost; two such vacancies read in the same search are not reposts of each other and both are listed
>
> — `spec.md §5, AC-19, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Add `zod`, `cheerio` and `@anthropic-ai/sdk` to `package.json` and refresh `package-lock.json` (the three libraries sad §2 lists; nothing else); keep `better-sqlite3` at `^12.10.1`
- [ ] `src/domain/vacancy.ts`: zod schemas and inferred types — `PostedDate` (`exact` | `range` {earliest, latest} | `unknown`), `Salary` {min?, max?, currency, period}, `Vacancy` {source, jobId, title, company, url, postedDate, salary?, description (empty until hydrated), partialDescription (default false)}; dates as `YYYY-MM-DD` day strings (a choice — no timezone drift; record it in the PR)
- [ ] `src/domain/vacancy.ts`: `repostFingerprint(company, title)` — lowercase each part, collapse runs of whitespace to one space, join with a separator that cannot occur in a normalised part (for example U+001F); nothing else normalised
- [ ] `src/domain/vacancy.ts`: `bestEstimate(postedDate)` — exact → itself, range → its middle day, unknown → `undefined` (used by ordering, AC-21)
- [ ] `src/domain/search-input.ts`: the `SearchInput` type only — `position`, `salaryRange?` {min?, max?, currency}, `postedSince?`, `location?`, `remoteOnly`, `judgingLimit`, `showEverything` (T18 adds validation)
- [ ] `src/domain/clock.ts`: `Clock { now(): Date; sleep(ms): Promise<void> }` and `systemClock`
- [ ] `test/domain/vacancy.test.ts`: fingerprint cases and schema cases (relative imports end in `.js`)

## Edge cases

| Case | Behaviour |
|---|---|
| Same company and title, different case and repeated spaces | identical fingerprint (AC-19) |
| Punctuation, accents or abbreviations differ | different fingerprints — nothing else is normalised |
| Leading or trailing whitespace | AC-19 does not say; do not add trimming here — the parsers (T10, T11) deliver trimmed text |
| Company `ab` + title `c` versus company `a` + title `bc` | different fingerprints — the separator prevents the collision |
| Empty company or title | schema rejects the vacancy — a lone separator would pass the data-model CHECK on the stored string |
| Empty source or job number | schema rejects it (identity needs both, data-model CHECK length > 0) |

## Definition of Done

- [ ] unit tests for the fingerprint (case, spacing, separator collision, empty parts) and the vacancy schema pass
- [ ] `npm run build` compiles with the three new libraries installed
- [ ] `src/domain/` stays free of I/O
- [ ] `npm run lint` and `npm run build` clean (the per-task gate)
