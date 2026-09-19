---
status: Draft
updated_at: "2026-09-19"
contract: cli.md
surface: cli
size: L
route: standard
---

# API sync report — ai-vacancy-finder

Contract form: **`contracts/cli.md`**, because `sad.md` declares `target_surfaces: [cli]` (read, not re-derived). `contracts/events.md` is not produced: SAD §8 Events is N/A, there are no queues or background work, and no async participant appears in any §6 flow.

Inputs found: `spec.md` ✓, `sad.md` (§6 flows 1–9 + cross-cutting) ✓, `data-model.md` ✓ (one entity, `shown_vacancy`), `CONTEXT.md` ✓, ADR 0001–0007 ✓, `.size` = L, `.route` = standard. No sources were edited.

## A. Field origins

| schema_path | origin | confidence |
|---|---|---|
| flag `--position` | spec US-01, AC-02 (no column, not persisted) | medium |
| flag `--salary-min` / `--salary-max` | spec US-04, AC-02, AC-13 (no column) | medium |
| flag `--currency` | sad.md §2 "currency and period match the range's"; no spec field | medium `# unresolved` OQ-1 |
| flag `--posted-since` | spec US-04, AC-02, AC-15 (no column) | medium |
| flag `--location` / `--remote` | sad.md §2 "one place plus a remote-only switch" | medium |
| flag `--cv` | spec US-01, AC-03; sad.md §3 | medium |
| flag `--judging-limit` | spec US-07, AC-02, AC-21; default 30 from spec §8 default + sad.md §2 | medium |
| flag `--show-everything` | spec US-05, AC-17, AC-20 | medium |
| flag `--model` | ADR 0004 (default `claude-sonnet-5`) | medium |
| flag `--db` | sad.md §7 and data-model.md (the file that holds `shown_vacancy`) | medium |
| env `ANTHROPIC_API_KEY` | spec §6.1, AC-05, `CLAUDE.md` Secrets | high |
| output `source` | data-model.md → `shown_vacancy.source` (text, non-empty) | high |
| output `job_id` | data-model.md → `shown_vacancy.job_id` (text, non-empty) | high |
| output title, company, apply link | spec US-02, AC-06; sad.md §5 vacancy shape (no column: not persisted) | medium |
| output fit (1–10), one-line reason | spec AC-06; ADR 0004 (`{fit, reason, containsInstructions}`) | medium |
| output `seen before` / `repost` marks | derived from reading `shown_vacancy` by primary key and by `idx_shown_vacancy_repost_fingerprint` (spec AC-17, AC-20) | high |
| output tags (`salary not listed`, `date approximate`, `date not listed`, `pay not comparable`) | spec AC-06, AC-14, AC-15, AC-15b; sad.md §2 (`pay not comparable`) | medium |
| output `fit based on a partial description`, `(vacancy text contained instructions)` | spec AC-08, AC-09; sad.md §5 partial-description flag | medium |
| output coverage buckets, counts, `Judgments made`, `Duration` | spec AC-10, AC-12, §6; ADR 0003 | medium |
| exit statuses 0 / 1 / 2 | sad.md §8 "Output and exit status" | high |
| usage codes `input.*`, `cv.*`, `key.missing` | sad.md §6 flow 3 branches; names are this stage's proposal | low |
| stop codes `source.*` | ADR 0002 stop kinds; names are this stage's proposal | low |
| reason codes `judge.*`, `search.*`, `store.unusable`, `output.print_failed` | sad.md §6 flows 3, 5, 6, 9 and cross-cutting; names are this stage's proposal | low |
| tie-break (equal fits keep judging order) | derived: a stable sort over the candidate order of sad.md §4 step 4 | low |
| `shown_vacancy.first_shown_at`, `repost_fingerprint` | data-model.md; written and read by `src/store/` only, no CLI surface | n/a (by design) |

`low` rows are declared incompleteness, not errors: the SAD asked this stage to fix those names (§6 "Reasons for not judged", §8 "Configuration").

## B. Drift checklist

| # | Point | Result | Note |
|---|---|---|---|
| 1 | Command ↔ data-model *(core)* | ✓ | The one command reads `shown_vacancy` (identity lookup, repost lookup) and writes it (idempotent mark-shown after printing). `--db` selects the file. Nothing in the contract needs a column that `data-model.md` lacks; `first_shown_at` is store-internal. |
| 2 | Error code ↔ repo error definition *(core)* | ✓ | No error registry found (`src/domain/` is empty): codes are the contract's proposal; reconcile when the repo defines them. |
| 3 | Validation ↔ constraint *(core)* | ✓ | `source` and `job_id` are printed as non-empty text as the CHECKs require. The repost fingerprint rule (lowercase, collapse spaces, nothing else) is stated in AC-19 and data-model.md and the CLI never accepts one. The salary period (a year) matches sad.md §2. Search inputs have no column, so nothing else to compare. |
| 4 | Contract ↔ sequences *(supporting)* | ✓ | Exit statuses match flows 1–9 and the cross-cutting flow: flow 3 (2, except unusable database → 1), flows 2 / 4 / 6 (1), flow 4 partial read and flows 7 / 9 (0), flow 4 `empty` (1, nothing marked seen). |

### Back-feed (coverage cross-check)

| Spec AC | Where the contract covers it |
|---|---|
| AC-01 | §1 synopsis, §5.2 layout |
| AC-02 | §2.1 validation, §6.1 `input.*` |
| AC-03 | §3 step 3, §6.1 `cv.*` |
| AC-04 | §6.2 `source.blocked`, §5.2 warning |
| AC-05 | §2.3, §6.1 `key.missing` |
| AC-06, AC-14, AC-15, AC-15b | §5.2 list groups, tags |
| AC-07, AC-07b | §6.2 `judge.*` |
| AC-08, AC-09 | §5.2 marks and reason suffix |
| AC-10, AC-11, AC-12 | §4 exit 1, §5.3 coverage report, §5.2 warnings |
| AC-13 | §2.1 salary bounds, coverage `Dropped for salary` |
| AC-16 | §5.2 no-list messages |
| AC-17, AC-20 | §2.2 `--show-everything`, §5.2 marks |
| AC-18, AC-22 | §7 seen-marking |
| AC-19 | §5.3 `Skipped, reposts` |
| AC-21 | §2.2 `--judging-limit`, §6.2 `search.judging_limit` |
| AC-23 | §6.2 `source.throttled` |

Every operation (the one command) maps to US-01 to US-07 and at least one AC. Every §6 flow branch has a stated outcome. Three gaps were found, none an api bug; they are upstream and listed in §D.

## C. Derived decisions to confirm

The contract made these calls where the sources are silent. None conflicts with a source; each is cheap to change.

1. **Only `--position` is a required search input** (confirmed by the job seeker). `--cv` is required too, read as the "CV file is missing" case of AC-03.
2. **`--salary-min` and `--salary-max` are independently optional**, an open end meaning "from X" / "up to X", the same reading AC-13 applies to a vacancy's pay. This adds no usage-error case.
3. **`--currency` with no salary bound is a usage error** (`input.currency_unused`), so an ignored flag is never swallowed.
4. **Every fit-judge call counts toward the judging limit**, including an unusable answer. Derived from spec §6, which measures "judgments per search ≤ the limit" by counting calls of a fake judge.
5. **Equal fits keep judging order** (newest first; with `--show-everything` new before seen), a stable sort. AC-06 orders by fit only.
6. **The CV contact notice goes to stderr**, keeping stdout a single result document (sad.md §8). The SAD does not name the stream.
7. **Default `data/` folder is created on a first run**; a `--db` path whose folder is missing is `store.unusable`. Otherwise the very first run would fail as an unusable database.
8. **No arguments reports the missing position (exit 2)** instead of the stub's help-and-exit-0. `--help` still exits 0. The smoke tests (`--help`, `--bogus`) are unaffected.
9. **Warnings sit between the list and the coverage report**, following sad.md §6 flows 2 and 6 and AC-11 ("above the coverage report").
10. **Not-judged wording for the limit** carries the ADR 0001 caveat in the report: the count may include vacancies the salary filter would have dropped.

## D. Findings and how each was resolved

Three back-feed gaps, so the run paused (≥ 3 flags). Each was resolved with the job seeker through the 4-state actions; no source was edited.

| # | Gap | Resolution |
|---|---|---|
| F1 | A salary range needs a currency (sad.md §2), but AC-02's list of invalid inputs has no case for a missing one, so a range without `--currency` has no specified outcome. | **Save as OQ → `specify`.** The contract makes `--currency` required with a range (`input.currency_missing`, exit 2), marked `# unresolved`. |
| F2 | Sequence gap: flow 6 and AC-07b name three AI-service stops (key rejected, allowance used up, unreachable). A wrong or retired `--model`, or any other non-retryable AI rejection, has no branch, and ADR 0004 would read it as `judge.unusable_answer` on every vacancy until the limit is spent. | **Save as OQ → `sequences`.** The contract carries `judge.service_rejected`, marked `# unresolved`: stops judging like the other three, RUN FAILED, exit 1. |
| F3 | Spec gap: if every judgment is an unusable answer, nothing is listed and the run is not failed, so AC-16's "no new vacancies" would mislead. | **Save as OQ → `specify`.** The contract prints a distinct line, `No vacancies listed: <n> could not be judged, see the coverage report.`, marked `# unresolved`, and exits 0. |

## E. Open questions

| # | Question | Owner | Due |
|---|---|---|---|
| OQ-1 | Add to spec §5 AC-02 (or a new AC) that a salary range without a currency is invalid input, and state which currency and period the range is in. | `specify` | before the contract is finalized |
| OQ-2 | Add to sad.md §6 flow 6 and spec AC-07b a branch for a non-retryable AI rejection other than key, allowance or unreachable (for example an unknown model): does it stop judging and fail the run? | `sequences` | before the contract is finalized |
| OQ-3 | Say in spec AC-07 / AC-16 what a run prints, and what it exits with, when vacancies were read but none was judged and none was listed without a stop. | `specify` | before the contract is finalized |

## F. Follow-ups for downstream stages (no action needed here)

- **`tasks` / `implement`:** the CLI stub in `src/cli.ts` accepts only `--help`; its `argv.length === 0` branch and help text change per §3 and §2. The zod search-input schema in `src/domain/search-input.ts` implements §2.1 and §6.1.
- **`plan-tests`:** the e2e (command) tier for a `cli` surface asserts the exit statuses of §4 and the streams of §5.1; a sentinel-CV / sentinel-key test covers QG-5 across every code in §6.
- **Spectral / OpenAPI lint:** not applicable to a `cli` contract.
- **Not specified anywhere:** behaviour on Ctrl-C. Nothing is marked seen before printing completes, so the safe direction holds; no exit status is fixed here.
- **Data-model, not this stage:** the staged migration file is named `01_create_shown_vacancy` while the live tree uses four digits (`0001_baseline`); data-model.md already hints it is promoted as `0002_…`, so `implement` should rename it on promotion.
