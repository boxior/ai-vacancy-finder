---
id: T6
title: "Implement the SQLite seen-store and the opener that creates or refuses the database"
layer: "infra"
deps: ["T1", "T4", "T5"]
blocks: ["T19"]
acs: ["AC-16", "AC-19", "AC-22"]
files_hint: ["src/store/sqlite-seen-store.ts", "src/store/open-store.ts", "test/store/sqlite-seen-store.test.ts", "test/support/open-memory-store.ts"]
owner: "Serhii Lyzun"
estimate: "M"
context_budget: "M"
status: "todo"
---

<!-- To the executing agent: work from what is inlined here. If a slice is insufficient, ambiguous,
or contradicts the code in front of you, open the named file for the full text and follow that.
Do not invent the missing part. Every inline is a snapshot with a provenance signature; the source wins. -->

# T6 — Implement the SQLite seen-store and the opener that creates or refuses the database

## Place in the sequence

- **Blocked by:** T1 — Define the vacancy shape, the search input type, the clock and the repost fingerprint, T4 — Define the three seam interfaces with their typed failures, the test fakes, and fix the fail-loudly wording, T5 — Promote the staged shown_vacancy migration into the live migrations · **Blocks:** T19 — Wire the adapters in src/cli.ts and set the output streams and exit status · **Wave:** 4, its last dependency, T4, sits in wave 3.
- **Lane:** Own lane.

## Why (user story)

> **As a** Job seeker
> **I want** later searches to list only vacancies I have not been shown, with a way to show everything
> **So that** I do not re-read what I already saw
>
> — `spec.md §4, US-05, verbatim` · full text: [spec.md](../spec.md)

This task reads and writes the seen memory, so a later search can tell what was already shown and a shown vacancy is remembered exactly once.

## Inlined context

> **Access patterns:**
> - "Was this card already shown?" (sad §6 flows 1, 7, 8) → the primary key.
> - "Is this card a repost of something shown?" (flows 7, 8) → `idx_shown_vacancy_repost_fingerprint`.
> - "Mark these vacancies as shown" (flows 1, 2, 4–10, one transaction after rendering) → `INSERT ... ON CONFLICT (source, job_id) DO NOTHING`. The write must be idempotent because "show everything" re-marks vacancies that are already stored (flow 8); a repeated write changes nothing, including `first_shown_at`.
>
> — `data-model.md §Entities, access patterns, verbatim` · full text: [data-model.md](../data-model.md)

> **Rules the schema deliberately does not enforce:**
> - `repost_fingerprint` is **not unique**. Two vacancies shown in the same search may share a fingerprint and both are listed (AC-19), and a repost shown under "show everything" gets its own row under its new job number.
> - Two vacancies read in the same search are never reposts of each other. That is pipeline logic in `src/search/`: the fingerprint lookup runs against the memory as it was before the search, and marking happens only after rendering.
> - A vacancy that was dropped, not judged or lost to a failure has **no row** (AC-18, AC-22). Only shown vacancies are written.
> - The fingerprint spans sources, since it is looked up without the `source` column. With one source this makes no difference; with a second source the same company and title on two sites would count as a repost, which is the intended dedupe. If that turns out wrong, a new migration can change the index.
>
> — `data-model.md §Entities, rules the schema deliberately does not enforce, verbatim` · full text: [data-model.md](../data-model.md)

> the seen database, a single SQLite file that defaults to `data/seen.sqlite` under the project root, resolved from the location of the compiled code and not from the current folder, so running from any folder reads the same memory (the same way the migration runner finds `migrations/`). A `--db <path>` flag overrides it.
>
> […]
>
> A missing file means a clean start (created and migrated); a file that exists but cannot be opened or migrated stops the run before any request, because a silent fresh memory would list everything as new.
>
> — `sad.md §7, seen database path and a missing or unusable file, abridged` · full text: [sad.md](../sad.md)

> `--db` behaviour: a missing file is created and migrated (a clean start). For the default path, its `data/` folder is created if missing. A file that exists but cannot be opened or migrated, or a `--db` path whose folder does not exist, is the unusable-database failure (§4, `store.unusable`), never a silent fresh memory.
>
> — `contracts/cli.md §2.2, `--db` behaviour, verbatim` · full text: [cli.md](../contracts/cli.md)

> **Seen-store** (`src/store/`) — seen-memory and repost fingerprint. Only `src/store/` touches the SQLite file.
>
> — `CLAUDE.md §The three seams, Seen-store, verbatim` · full text: [CLAUDE.md](../../../../CLAUDE.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full ([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) · [cli.md](../contracts/cli.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

> | Column | Type | Constraints | Notes |
> |---|---|---|---|
> | `source` | TEXT | NOT NULL, CHECK (length > 0), part of PK | Source name as registered in `src/sources/index.ts` (for example `linkedin`). |
> | `job_id` | TEXT | NOT NULL, CHECK (length > 0), part of PK | The site's own job number, kept as text because a site may use a non-numeric id. |
> | `repost_fingerprint` | TEXT | NOT NULL, CHECK (length > 0) | Company plus title, each lowercased with repeated spaces collapsed and nothing else normalised (AC-19). Built only by a function in `src/domain/`; the database stores it as an opaque string. |
> | `first_shown_at` | TEXT | NOT NULL | ISO-8601 UTC timestamp of the first time the vacancy was shown. Taken from the injected `Clock` (ADR 0006), never from a database default, so tests with a fake clock are deterministic. Not read by any query today. |
>
> — `data-model.md §Entities, table shown_vacancy, verbatim` · full text: [data-model.md](../data-model.md)

Change: read and written (schema created by T5). The default database file is `data/seen.sqlite` under the project root.

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-16 — happy path

> **Given** the job seeker ran a search earlier and it listed vacancies
> **When** the job seeker runs a search that reads some of those vacancies again
> **Then** only vacancies not shown in any earlier search are listed, the coverage report says how many already seen were skipped, and when nothing is new the system says there are no new vacancies together with the read and skipped counts
>
> — `spec.md §5, AC-16, verbatim` · full text: [spec.md](../spec.md)

### AC-19 — happy path

> **Given** a vacancy from a company with a given title was shown in an earlier search
> **When** the same company posts the same title again under a new job number or date (company and title are compared after lowercasing and collapsing repeated spaces, and nothing else is normalised)
> **Then** it is not listed as new and the coverage report counts it as a repost; two such vacancies read in the same search are not reposts of each other and both are listed
>
> — `spec.md §5, AC-19, verbatim` · full text: [spec.md](../spec.md)

### AC-22 — domain invariant

> **Given** vacancies were not judged because of the limit or a failure
> **When** the job seeker searches again
> **Then** those vacancies are treated as new and are judged, because a vacancy counts as seen only once it has been shown
>
> — `spec.md §5, AC-22, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `src/store/sqlite-seen-store.ts`: implement `SeenStore` (T4) over a `better-sqlite3` database with prepared statements — `findShown(ids)` by primary key, `findFingerprints(fps)` through the fingerprint index, `markShown(rows)` as one transaction of `INSERT ... ON CONFLICT (source, job_id) DO NOTHING`; `first_shown_at` is the timestamp passed in from the `Clock`, never a database default
- [ ] `src/store/open-store.ts`: `openSeenStore({ path?, migrate })` implementing `SeenStoreOpener` — default path `data/seen.sqlite` resolved from `import.meta.url` like `DEFAULT_MIGRATIONS_DIR` in `src/store/migrate.ts`, its `data/` folder created for the default path only; open, run `migrate(db)`; a file that exists but cannot be opened or migrated, or a `--db` path whose folder is missing, returns `{ unusable: { detail } }` — never a silent fresh file
- [ ] Only `src/store/` imports `better-sqlite3` — add a test that greps `src/` for other importers
- [ ] `test/support/open-memory-store.ts`: `openMemoryStore()` (in-memory database migrated with `migrate(db)`) and `aShownVacancy(overrides?)` as described in data-model 'Test fixtures'; fictional companies, no CV text
- [ ] `test/store/sqlite-seen-store.test.ts` against real SQLite (in memory and temporary files)

## Edge cases

| Case | Behaviour |
|---|---|
| Mark a vacancy that is already stored | no change, `first_shown_at` kept — idempotent, so show-everything can re-mark safely |
| Two vacancies with the same fingerprint in one mark call | both stored (AC-19) |
| Corrupt file, or a file that is not a SQLite database | `unusable`; the file is never overwritten |
| `--db` path in a folder that does not exist | `unusable` (only the default path's `data/` is created) |
| Run from a different current folder | the default path resolves to the same file |
| Empty fingerprint reaches `markShown` | the CHECK violation is thrown, not swallowed |
| A write fails part-way | nothing is written — one transaction |

## Definition of Done

- [ ] store tests pass against real SQLite: lookup by identity, lookup by fingerprint, idempotent mark, unusable file
- [ ] only `src/store/` touches `better-sqlite3` (test)
- [ ] `npm test` and lint green
- [ ] `npm run lint` and `npm run build` clean (the per-task gate)
