# Audit — data-model, ai-vacancy-finder, 2026-09-19

**Migrations are staged — not yet in the live `migrations/` tree; `implement` promotes them.** Nothing was written to `migrations/`.

## Staged migration files

| Staged path | Direction |
|---|---|
| `docs/features/ai-vacancy-finder/migrations/01_create_shown_vacancy.up.sql` | up |
| `docs/features/ai-vacancy-finder/migrations/01_create_shown_vacancy.down.sql` | down |

Output: `docs/features/ai-vacancy-finder/data-model.md` (one entity, `shown_vacancy`, two indexes counting the primary key).

## Promote-time convention hint

The repo is sequential with four digits and no gaps (`migrations/NNNN_name.up.sql`, checked by `loadMigrations` in `src/store/migrate.ts`). Only `0001_baseline` exists, so the next number is **0002**: `implement` promotes the pair as `0002_create_shown_vacancy.up.sql` and `.down.sql`, and assigns the real number at promotion in case another change promotes first. The runner rejects gaps and a missing `.down.sql`.

## Conventions: where each choice came from

| Topic | Decision | Source |
|---|---|---|
| Migration tool and naming | Numbered `.up.sql` / `.down.sql` pairs, `user_version` | `docs/architecture-map.md` §Migrations, repo ADR 0003, `src/store/migrate.ts` (architecture and repo agree, no divergence) |
| Identity | `(source, job_id)` plus a company-plus-title fingerprint | repo ADR 0003, `CLAUDE.md` Identity |
| What is stored | Identity and fingerprint only, never CV text | spec §6.1, sad §8 |
| Primary key | Composite `(source, job_id)`, `WITHOUT ROWID` | **Confirmed with the user** (greenfield, no existing table) |
| Audit columns | `first_shown_at` only, written by the app from the `Clock` | **Confirmed with the user** |
| Column strictness | `STRICT`, all columns `NOT NULL`, `CHECK (length > 0)` on the three text identity columns | **Confirmed with the user** |
| Delete strategy | None: hard delete by deleting the file | `docs/architecture-map.md` Datastores |

**Deliberate first-of-its-kind choices (no precedent in the repo, so they set one):** `STRICT` tables, `CHECK` constraints and `WITHOUT ROWID`. The user confirmed them. Later migrations should match unless there is a reason not to.

No divergence between the architecture and the repo was found.

## Self-checks (all pass)

1. **Naming** — `shown_vacancy`, snake_case columns, index `idx_<table>_<column>`; the only existing migration is an empty baseline, so there is no other schema to match. Pass.
2. **Down reversibility** — the `CREATE TABLE` has a `DROP TABLE` and the `CREATE INDEX` a `DROP INDEX`. Verified by running the pair through the real runner (`migrate`) on an in-memory database with SQLite 3.53.2: 0 → 2 → 1 → 0, and after the down step no `shown_vacancy` object remained. Pass.
3. **FK indexes** — the table has no foreign keys. The one index serves a concrete query (repost lookup); the identity lookup is served by the primary key. Both read paths confirmed with `EXPLAIN QUERY PLAN` (primary key search, covering-index search). Pass.
4. **Convention adherence** — follows the architecture and the confirmed choices; the statements are idempotent (`IF NOT EXISTS` / `IF EXISTS`; re-running the up file changed nothing). Pass.

Behaviour also checked on a scratch database: the upsert `ON CONFLICT (source, job_id) DO NOTHING` inserts once and ignores the repeat; a second vacancy with the same fingerprint and a new job number is accepted; empty `source`, `job_id` or `repost_fingerprint` and a NULL timestamp are rejected.

## Drift report

**Not applicable yet.** `src/domain/` is empty, so there are no fields to map to columns and no `_drift/*.sql` was produced. Re-run `/sdd:data-model ai-vacancy-finder --drift-only` after `implement` has written the seen-store and domain types.

## Breaking-change decompositions

None. The table is new; no existing table changes.

## Seeds

None. There is no bootstrap or lookup data; test fixtures are described in `data-model.md` and live under `test/`.

## Open items and notes for later stages

- **Not a `<!-- TBD -->`, but for `tasks` / `implement`:** the exact fingerprint string is built by `src/domain/`. It must be injective over (company, title), so the two parts have to be joined with a separator that cannot survive normalisation. Otherwise `"a b" + "c"` and `"a" + "b c"` collide. Add a unit test for it.
- **Cross-source reposts:** the fingerprint lookup ignores `source`. Harmless with one source and probably desirable with two; revisit when the second source lands (recorded in `data-model.md`).
- **Timestamp format:** `first_shown_at` is ISO-8601 UTC text. The schema has no `CHECK` on the format, so `src/store/` is responsible for writing it from the `Clock`.
- **Preflight tie-in (sad §6 flow 3):** a database that exists but cannot be opened or migrated is the typed "seen memory unusable" failure. The runner already throws on a database newer than the known migrations.
- **Stale doc, not changed here:** `docs/architecture-map.md` still lists no per-table detail; the next `survey` can record `shown_vacancy` once the migration is promoted.
- **Fast lane:** this feature does change a schema, so `data-model` was required. `api` is a separate question: it is skipped only if there is no contract change, which is not the case here (a CLI command contract exists, sad §8 "Configuration" defers flag names to `api`).

## Next stage

`/sdd:api ai-vacancy-finder`
