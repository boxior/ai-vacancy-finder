---
id: T5
title: "Promote the staged shown_vacancy migration into the live migrations"
layer: "migration"
deps: []
blocks: ["T6"]
acs: ["AC-16"]
files_hint: ["docs/features/ai-vacancy-finder/migrations/01_create_shown_vacancy.up.sql", "docs/features/ai-vacancy-finder/migrations/01_create_shown_vacancy.down.sql", "test/migrate.test.ts"]
owner: "Serhii Lyzun"
estimate: "S"
context_budget: "M"
status: "todo"
---

<!-- To the executing agent: work from what is inlined here. If a slice is insufficient, ambiguous,
or contradicts the code in front of you, open the named file for the full text and follow that.
Do not invent the missing part. Every inline is a snapshot with a provenance signature; the source wins. -->

# T5 — Promote the staged shown_vacancy migration into the live migrations

## Place in the sequence

- **Blocked by:** — · **Blocks:** T6 — Implement the SQLite seen-store and the opener that creates or refuses the database · **Wave:** 1, no upstream task, so it starts in the first wave.
- **Lane:** Migration lane (serialized by `implement`). The live `migrations/` tree currently holds only `0001_baseline`.

## Why (user story)

> **As a** Job seeker
> **I want** later searches to list only vacancies I have not been shown, with a way to show everything
> **So that** I do not re-read what I already saw
>
> — `spec.md §4, US-05, verbatim` · full text: [spec.md](../spec.md)

This task creates the seen-memory table that lets a later search list only vacancies the job seeker has not been shown.

## Inlined context

> **Migrations.** `migrations/NNNN_name.up.sql` with a matching `.down.sql`, numbered without gaps, applied by the runner in `src/store/migrate.ts`; the version lives in SQLite `user_version`. Change the schema by adding a new pair, never by editing an applied one.
>
> — `CLAUDE.md §Rules, Migrations, verbatim` · full text: [CLAUDE.md](../../../../CLAUDE.md)

> | Staged file | Promoted as (hint) | What it does |
> |---|---|---|
> | `01_create_shown_vacancy.up.sql` | `migrations/0002_create_shown_vacancy.up.sql` | Creates `shown_vacancy` and its fingerprint index, both `IF NOT EXISTS`. |
> | `01_create_shown_vacancy.down.sql` | `migrations/0002_create_shown_vacancy.down.sql` | Drops the index, then the table, both `IF EXISTS`. |
>
> There is no expand-backfill-contract sequence: the table is new, so no existing table changes. The runner wraps each file in a transaction and sets `user_version` itself, so the files contain no transaction or pragma statements.
>
> — `data-model.md §Migrations, staged files and the runner, abridged` · full text: [data-model.md](../data-model.md)

> the staged migration file is named `01_create_shown_vacancy` while the live tree uses four digits (`0001_baseline`); data-model.md already hints it is promoted as `0002_…`, so `implement` should rename it on promotion.
>
> — `contracts/api-sync-report.md §F, follow-up for tasks / implement, abridged` · full text: [api-sync-report.md](../contracts/api-sync-report.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full ([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) · [cli.md](../contracts/cli.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

> | Column | Type | Constraints | Notes |
> |---|---|---|---|
> | `source` | TEXT | NOT NULL, CHECK (length > 0), part of PK | Source name as registered in `src/sources/index.ts` (for example `linkedin`). |
> | `job_id` | TEXT | NOT NULL, CHECK (length > 0), part of PK | The site's own job number, kept as text because a site may use a non-numeric id. |
> | `repost_fingerprint` | TEXT | NOT NULL, CHECK (length > 0) | Company plus title, each lowercased with repeated spaces collapsed and nothing else normalised (AC-19). Built only by a function in `src/domain/`; the database stores it as an opaque string. |
> | `first_shown_at` | TEXT | NOT NULL | ISO-8601 UTC timestamp of the first time the vacancy was shown. Taken from the injected `Clock` (ADR 0006), never from a database default, so tests with a fake clock are deterministic. Not read by any query today. |
>
> […]
>
> **Primary key:** `(source, job_id)`, the vacancy identity of repo ADR 0003 and `CLAUDE.md` (Identity).
>
> […]
>
> **Constraints:** PK `(source, job_id)`; NOT NULL on every column; CHECK not-empty on `source`, `job_id` and `repost_fingerprint`, so that an empty fingerprint can never make every vacancy look like a repost of every other. No foreign keys.
>
> […]
>
> | Index | Columns | Query it serves |
> |---|---|---|
> | primary key (implicit, the table's own storage) | `(source, job_id)` | Identity lookup of a batch of cards, and the conflict target of the idempotent write (flows 1, 7, 8). |
> | `idx_shown_vacancy_repost_fingerprint` | `repost_fingerprint` | Repost lookup of a batch of cards by fingerprint (flows 7, 8; AC-19, AC-20). |
>
> — `data-model.md §Entities, table shown_vacancy, and Indexes, abridged` · full text: [data-model.md](../data-model.md)

Change: added — new table and index; nothing else changes. Staged pair: `docs/features/ai-vacancy-finder/migrations/01_create_shown_vacancy.up.sql` and `.down.sql` (`implement` promotes them to `migrations/0002_create_shown_vacancy.*`).

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-16 — happy path

> **Given** the job seeker ran a search earlier and it listed vacancies
> **When** the job seeker runs a search that reads some of those vacancies again
> **Then** only vacancies not shown in any earlier search are listed, the coverage report says how many already seen were skipped, and when nothing is new the system says there are no new vacancies together with the read and skipped counts
>
> — `spec.md §5, AC-16, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Move (not copy) the staged pair to `migrations/0002_create_shown_vacancy.up.sql` and `migrations/0002_create_shown_vacancy.down.sql` — four-digit number, no gap after `0001`; do not edit the SQL (it was reviewed and its query plans checked at `data-model`); the files hold no transaction or pragma statements because the runner wraps each in a transaction and sets `user_version`
- [ ] Fix `test/migrate.test.ts`: it assumes the live head is version 1 (`migrate(db)` returns 1, '0 -> 1 -> 0', 'no-op when already at the target'); derive the head from `loadMigrations().length` or point those cases at a temporary directory, and keep the failing-migration, missing-down and gap tests as they are
- [ ] Add a round-trip test for 0002: after `migrate(db)` the table `shown_vacancy` and index `idx_shown_vacancy_repost_fingerprint` exist and `user_version` is 2; an empty `source`, `job_id` or `repost_fingerprint` is rejected; a duplicate `(source, job_id)` is rejected; two rows with the same fingerprint are accepted; `migrate(db, 1)` drops index and table, `migrate(db, 0)` returns to 0

## Edge cases

| Case | Behaviour |
|---|---|
| Empty `source`, `job_id` or `repost_fingerprint` | CHECK rejects the insert, so an empty fingerprint can never make every vacancy look like a repost |
| Two rows with the same fingerprint | accepted — the fingerprint is deliberately not unique (AC-19) |
| `up` run on a database already at 2 | the runner does nothing; the SQL is also `IF NOT EXISTS` |
| `down` at version 2 | drops the index, then the table; `user_version` becomes 1 |
| The existing 0001 round-trip test | keeps passing after the edit — the baseline is untouched |

## Definition of Done

- [ ] the staged pair is promoted to `migrations/0002_*` and applies and reverts cleanly (test)
- [ ] `npm test` is green including the updated `test/migrate.test.ts`
- [ ] numbering is `0001`, `0002` with no gaps and each `.up.sql` has its `.down.sql`
- [ ] `npm run lint` and `npm run build` clean (the per-task gate)
