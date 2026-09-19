---
status: Draft
owner: "Serhii Lyzun"
updated_at: "2026-09-19"
feature_size: "L"
surface: cli
derived_from: [spec.md, sad.md, data-model.md]
---

# CLI contract — ai-vacancy-finder

The command, flag, environment, output and exit-status surface of the `cli` target surface. Derived from `spec.md` §4/§5, the `sad.md` §6 flows and `data-model.md`; never hand-typed. Every flag and output field is traced to its origin in [`api-sync-report.md`](./api-sync-report.md). Names and defaults that the SAD left to this stage (§8 "Configuration", §6 "Reasons for not judged") are fixed here.

Placeholder data only: companies are fictional, URLs use `example.test`, no CV text appears.

Items marked `# unresolved` wait on an open question in the sync report (§E); the contract keeps the current interim behaviour.

## 1. Synopsis

One command, no sub-commands, flags only (SAD §8: no config file in v1).

```
ai-vacancy-finder --position <text> --cv <path> [filters] [run options]
node dist/cli.js  --position <text> --cv <path> [filters] [run options]
```

`ai-vacancy-finder` is the `bin` entry in `package.json` (`dist/cli.js`). Positional arguments are not accepted (`parseArgs` strict mode): any is a usage error, exit 2. There are no short flags except `-h`.

## 2. Options

### 2.1 Search

| Flag | Value | Required | Default | Meaning | Origin |
|---|---|---|---|---|---|
| `--position` | text | **yes** | — | The job position to search for. | US-01, AC-02 |
| `--salary-min` | integer ≥ 0 | no | none (open end) | Lower end of the yearly salary range. | US-04, AC-13 |
| `--salary-max` | integer ≥ 0 | no | none (open end) | Upper end of the yearly salary range. | US-04, AC-13 |
| `--currency` | 3 letters (ISO 4217), case-insensitive, stored upper-case | **only with a salary bound** | — | Currency of the range. The period is always one year and is not a flag. | SAD §2 (pay comparability); `# unresolved` OQ-1 |
| `--posted-since` | `YYYY-MM-DD` | no | none (no date filter) | Earliest posted date to keep. | US-04, AC-02, AC-15 |
| `--location` | text | no | none (the source's default scope) | One place to search in. | SAD §2 (settled from spec §8) |
| `--remote` | switch | no | off | Remote-only. May be combined with `--location`. | SAD §2 (settled from spec §8) |

An omitted filter does not filter. Only `--position` is a required search input.

Validation (each failure is a usage error, exit 2, see §4):

- `--position` is non-empty after trimming.
- `--salary-min` and `--salary-max` are whole numbers ≥ 0. When both are given, `--salary-min` ≤ `--salary-max` (AC-02: a lower end above the upper end is invalid). One bound alone is an open-ended range: "from X" is X and up, "up to X" is 0 to X, the same reading AC-13 applies to a vacancy's pay.
- `--currency` is required when either salary bound is given, and is invalid without one (it would have no effect, and an ignored flag is a swallowed input).
- `--posted-since` is a real calendar date, and is not after today. Today is the machine's local date from the injected `Clock`; today itself is allowed (AC-02).
- `--location` is non-empty after trimming when given.

### 2.2 Run

| Flag | Value | Required | Default | Meaning | Origin |
|---|---|---|---|---|---|
| `--cv` | path | **yes** | — | The job seeker's CV: a `.txt` or `.md` file (extension compared case-insensitively). | US-01, AC-03 |
| `--judging-limit` | integer ≥ 1 | no | `30` | The most vacancies this search may send to fit judgment. Every fit-judge call counts, including one that ends "unusable answer". | US-07, AC-02, AC-21, §6 |
| `--show-everything` | switch | no | off | List vacancies shown before, and reposts, as well as new ones; they are judged again and count toward the limit. | US-05, AC-17, AC-20 |
| `--model` | text | no | `claude-sonnet-5` | Claude model used to judge fit. | ADR 0004 |
| `--db` | path | no | `data/seen.sqlite` under the project root, resolved from the compiled code, not the current folder | The seen-memory SQLite file. | SAD §7, data-model |
| `-h`, `--help` | switch | no | — | Print usage to stdout and exit 0. | existing stub |

`--judging-limit` must be a whole number ≥ 1 (AC-02: zero or less is invalid). `--model` is non-empty after trimming.

`--db` behaviour: a missing file is created and migrated (a clean start). For the default path, its `data/` folder is created if missing. A file that exists but cannot be opened or migrated, or a `--db` path whose folder does not exist, is the unusable-database failure (§4, `store.unusable`), never a silent fresh memory.

### 2.3 Environment

| Variable | Required | Meaning |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | The AI access key. Read only from the environment; never printed, logged or written to a file (spec §6.1, `CLAUDE.md`). Missing or empty is `key.missing`. |

No other variable is read. There is no `.env` loading.

## 3. Preflight order

Everything here happens before a single request to a source or to the Claude API, and marks nothing seen. The first failing group stops the run.

1. **Command line.** Unknown flag, missing flag value or positional argument → `input.unknown_option`. With no arguments at all the command reports the missing position (`input.position_missing`) and points to `--help`; it does not print help and exit 0 as the current stub does.
2. **Inputs.** Every problem in §2.1 and the `--judging-limit`, `--model` checks is reported together in one message, one line per problem.
3. **CV.** `--cv` omitted (`cv.path_missing`), file not found or unreadable (`cv.unreadable`), extension other than `.txt` / `.md` (`cv.unsupported_format`), empty or whitespace-only (`cv.empty`).
4. **Key.** `ANTHROPIC_API_KEY` missing or empty (`key.missing`).
5. **CV contact notice.** If the CV text looks like it holds an email address or a phone number, one notice goes to stderr and the run continues (§5.1). The matched text is never printed.
6. **Seen memory.** Search opens the database (`--db`); `store.unusable` fails the run here (§4).

## 4. Exit statuses

| Status | Meaning | When |
|---|---|---|
| `0` | Run completed | A run that passed preflight and did not fail: including a partial-read warning (AC-12), "no new vacancies" (AC-16), and `--help`. |
| `1` | Run failed | The coverage report carries a `RUN FAILED` line (AC-11): a source blocked, throttled, failed or empty; the AI service stopped judging; the accounting did not add up; an unexpected error; the seen memory unusable; or the result could not be printed. |
| `2` | Usage error | Invalid input, unknown flag, CV problem or missing key (§3 steps 1–4). Nothing was read, and the message goes to stderr only. |

A rejected run (status 2) has made no request to a source or to the Claude API and has marked nothing seen. A status 1 run has printed a coverage report whenever the result could be printed (QG-1).

## 5. Output

### 5.1 Streams

- **stdout** carries one document per completed or failed run: the vacancy list, the warnings, the coverage report, in that order (SAD §8). Redirecting stdout to a file therefore keeps every warning.
- **stderr** carries usage errors (status 2), the CV contact notice, and the plain message when the result itself could not be printed.
- Neither stream ever holds CV text or the AI key, in any outcome (QG-5).

Usage error line format, one per problem:

```
error[<code>]: <message>
```

### 5.2 Document layout (stdout)

```
<vacancy list, or one of the no-list messages>

<loud warnings, zero or more>

COVERAGE REPORT
<per-source block>
<Judgments made / Duration>
<RUN FAILED line, when the run failed>
```

**Vacancy list.** Judged vacancies only. Two groups: **untagged** vacancies first, then **tagged** ones under a `Tagged vacancies` heading (AC-06, AC-14). Within a group, ordered by fit, best first; equal fits keep judging order (newest first, and with `--show-everything` new ones before those shown before). A vacancy that was judged is listed however low its fit (AC-06).

Each vacancy is one entry:

```
[<fit>/10] <title> — <company>
  <apply link>
  <one-line reason>
  <marks and tags, when any>
```

- `fit` is a whole number 1–10; `reason` is one line.
- **Tags** (a vacancy with at least one is in the tagged group; all its tags are shown): `salary not listed`, `date approximate`, `date not listed`, `pay not comparable`. `pay not comparable` is the tag for a stated pay whose currency or period differs from the range's (SAD §2).
- **Marks** (shown on the entry, never place a vacancy in the tagged group): `seen before` (a vacancy shown in an earlier search, `--show-everything` only), `repost` (same company and title as one shown before, `--show-everything` only), `fit based on a partial description` (AC-08).
- A vacancy whose text tried to instruct the judge (AC-09) ends its reason line with `(vacancy text contained instructions)`.

**No-list messages.** The list is never printed bare (AC-11); each of these is followed by the coverage report:

| Situation | Message |
|---|---|
| Vacancies were read, none is listed, and none is "not judged": all were seen, reposts or dropped by filters (AC-16) | `No new vacancies. Read <n>, skipped <s> already seen and <r> reposts, dropped <d>.` |
| Vacancies were read, none is listed, at least one was "not judged", and the run did not fail (only `judge.unusable_answer` or `search.judging_limit` leave a run unfailed) `# unresolved` OQ-3 | `No vacancies listed: <n> could not be judged, see the coverage report.` |
| A source stopped (blocked, throttled, failed, empty) and nothing was judged | the loud warning (below) stands in for the list |

**Loud warnings.** Each is a block above the coverage report, naming the cause:

| Trigger | Text |
|---|---|
| A source stop (AC-04, AC-11, AC-23) | `WARNING: source <name> was <blocked | throttled | failed | empty>: <detail>. <n> vacancies were not read or not judged because of it.` |
| The AI service stopped (AC-07b) | `WARNING: judging stopped: <cause>. <n> vacancies were not judged.` |
| A partial read (AC-12) | `WARNING: partial read from <name>: read <k> of <e> expected.` (does not fail the run) |
| An unexpected error | `WARNING: unexpected error: <sanitised message>.` (never CV text or the key) |
| Accounting mismatch | `WARNING: the coverage buckets add up to <x> but <n> vacancies were read.` (fails the run) |

### 5.3 Coverage report

Every run that passed preflight ends with it, including failed runs (spec §6, QG-1). One block per source; the seven buckets add up to the read count (AC-10), checked in this order, each read vacancy counted in exactly one:

```
COVERAGE REPORT
Source: linkedin
  Read: 45
    Dropped for date:           5
    Dropped for salary:         4
    Skipped, already seen:     20
    Skipped, reposts:           3
    Not judged:                 3
      judging limit:           3   (may include vacancies the salary filter would have dropped)
    Judged:                    10
  Kept without a stated salary: 6   (counted within the buckets above)
  Kept without a stated date:   2   (counted within the buckets above)
  Expected by the site:        120  (read 45)          <- only when the site states a count
Judgments made: 10 of a limit of 30
Duration: 3 min 12 s
```

- Buckets, in the AC-10 order: dropped for date, dropped for salary, skipped as already seen, skipped as reposts, not judged (broken down by reason, §6.2), judged. With `--show-everything`, seen vacancies and reposts are candidates and are counted as judged or not judged, and the reposts count is still printed (AC-20).
- `Judgments made` is the number of fit-judge calls; it never exceeds the limit (spec §6).
- `Duration` comes from the injected `Clock`.
- A failed run ends the report with `RUN FAILED: <cause>` (AC-11). A run that did not fail has no such line.

## 6. Codes

No error registry exists in the repo yet (`src/domain/` is empty). These codes are this contract's proposal, in the neutral `module.error_name` convention; the printed text is stable, the code is the identifier tests and future `--json` output key on. `# proposal` until the repo defines its own.

### 6.1 Usage errors (stderr, exit 2)

| Code | Trigger | Message (template) | AC |
|---|---|---|---|
| `input.unknown_option` | Unknown flag, missing value, positional argument | `unknown option or argument: <arg>` | — |
| `input.position_missing` | `--position` omitted or blank | `--position is required: say which job position to search for` | AC-02 |
| `input.salary_invalid` | A bound is not a whole number ≥ 0 | `--salary-min/--salary-max must be whole numbers, 0 or more` | AC-02 |
| `input.salary_range_inverted` | `--salary-min` > `--salary-max` | `--salary-min (<a>) is above --salary-max (<b>)` | AC-02 |
| `input.currency_missing` | A salary bound without `--currency` `# unresolved` OQ-1 | `--currency is required with a salary range, for example --currency USD` | — |
| `input.currency_unused` | `--currency` with no salary bound | `--currency has no effect without --salary-min or --salary-max` | — |
| `input.currency_invalid` | `--currency` is not 3 letters | `--currency must be a 3-letter code such as USD or EUR` | — |
| `input.posted_since_invalid` | Not a `YYYY-MM-DD` calendar date | `--posted-since must be a date like 2026-09-01` | AC-02 |
| `input.posted_since_in_future` | After today | `--posted-since <d> is in the future` | AC-02 |
| `input.judging_limit_invalid` | Not a whole number ≥ 1 | `--judging-limit must be a whole number, 1 or more` | AC-02 |
| `input.location_blank` / `input.model_blank` | Blank value | `--location must not be blank` / `--model must not be blank` | — |
| `cv.path_missing` | `--cv` omitted | `--cv is required: give the path to your CV (.txt or .md)` | AC-03 |
| `cv.unreadable` | Not found, a directory, no permission | `cannot read the CV at <path>: <reason>` | AC-03 |
| `cv.unsupported_format` | Extension not `.txt` / `.md` | `the CV format <ext> is not supported; accepted formats are .txt and .md` | AC-03 |
| `cv.empty` | Empty or whitespace-only | `the CV file <path> is empty` | AC-03 |
| `key.missing` | `ANTHROPIC_API_KEY` unset or empty | `ANTHROPIC_API_KEY is not set: export it in your shell, for example export ANTHROPIC_API_KEY=<your key>` | AC-05 |

### 6.2 Run outcomes (stdout, exit 1 where they fail the run)

Source stops — the typed stop of ADR 0002:

| Code | Meaning | Fails the run | AC |
|---|---|---|---|
| `source.blocked` | A sign-in page instead of public results; never bypassed | yes | AC-04 |
| `source.throttled` | Refused after ≤ 3 retries and ≤ 1 min of waiting per source | yes | AC-23 |
| `source.failed` | Error or unreadable page | yes | AC-11 |
| `source.empty` | No vacancies at all | yes | AC-11 |

`source.empty` has no read vacancies, so it never appears as a "not judged" reason; the other three do (for the read cards it stopped short of).

Reasons for "not judged" (each shown with its count in the coverage report; a not-judged vacancy is not listed and not marked seen, AC-07, AC-22):

| Code | Meaning | Fails the run |
|---|---|---|
| `source.blocked`, `source.throttled`, `source.failed` | The source stopped before the vacancy was hydrated | yes |
| `judge.key_rejected` | The AI service rejected the key | yes (AC-07b) |
| `judge.allowance_exhausted` | No allowance left | yes (AC-07b) |
| `judge.unreachable` | No answer after the client's own retries | yes (AC-07b) |
| `judge.service_rejected` | Any other non-retryable AI rejection, for example an unknown `--model` `# unresolved` OQ-2 | yes |
| `judge.unusable_answer` | The answer was unusable or failed the schema check; only this vacancy is affected | no (AC-07) |
| `search.judging_limit` | Over the judging limit; treated as new next time (AC-22) | no |
| `search.unexpected_error` | An exception no typed value covers; the message never holds CV text or the key | yes |

Run failures without a "not judged" reason: `store.unusable` (the seen memory cannot be opened, created or migrated: nothing is read, empty accounting, `RUN FAILED`, exit 1) and `output.print_failed` (the result could not be printed: plain message on stderr, nothing marked seen, exit 1).

## 7. Guarantees

- **Nothing swallowed.** Every failure above reaches the output; the list is never printed without the coverage report after it (`CLAUDE.md` Rules).
- **Seen-marking.** Only vacancies that were shown are marked seen, in one transaction, only after the result was printed. A vacancy that was dropped, not judged or lost to a failure is not marked and comes back as new (AC-18, AC-22). If printing fails, nothing is marked. The write is idempotent, so `--show-everything` re-marks safely.
- **Bounded cost.** At most `--judging-limit` fit-judge calls per search, sequential; at most 1 page request per second per source; ≤ 3 retries and ≤ 1 min of waiting per source (spec §6).
- **Untrusted text.** Vacancy text is data; the judge reports whether it contained instructions; nothing else acts on it (AC-09).
- **No sign-in.** No account of the job seeker is ever signed in to a source (AC-04).

Not in v1: `--json` output, `--version`, sub-commands, a config file, scheduling, several CVs, several sources selectable by flag (spec §3, SAD §11 accepted debt).

## 8. Examples

### 8.1 Successful search

```
$ export ANTHROPIC_API_KEY=<your key>
$ ai-vacancy-finder --position "Senior Backend Engineer" --salary-min 80000 --salary-max 120000 \
    --currency USD --posted-since 2026-09-01 --location "Example City" --cv ./cv.md
```

```
[9/10] Senior Backend Engineer — Example Co
  https://www.example.test/jobs/view/1000001
  Node and SQLite match your last two roles; stated pay is inside the range.

[7/10] Backend Engineer — Sample Ltd
  https://www.example.test/jobs/view/1000002
  Good stack match; the description is short on seniority.
  fit based on a partial description

Tagged vacancies
[8/10] Staff Engineer — Test Corp
  https://www.example.test/jobs/view/1000003
  Strong match on platform work.
  salary not listed, date approximate

COVERAGE REPORT
Source: linkedin
  Read: 45
    Dropped for date:           5
    Dropped for salary:         4
    Skipped, already seen:     20
    Skipped, reposts:           3
    Not judged:                 3
      judging limit:           3   (may include vacancies the salary filter would have dropped)
    Judged:                    10
  Kept without a stated salary: 6   (counted within the buckets above)
  Kept without a stated date:   2   (counted within the buckets above)
Judgments made: 10 of a limit of 30
Duration: 3 min 12 s
```

Exit status `0`. (Three of the ten judged entries are shown.)

### 8.2 Usage error

```
$ ai-vacancy-finder --salary-min 90000 --salary-max 80000 --cv ./cv.md
error[input.position_missing]: --position is required: say which job position to search for
error[input.salary_range_inverted]: --salary-min (90000) is above --salary-max (80000)
error[input.currency_missing]: --currency is required with a salary range, for example --currency USD
```

Exit status `2`; nothing was read.

### 8.3 Source throttled mid-run

```
[8/10] Senior Backend Engineer — Example Co
  https://www.example.test/jobs/view/1000001
  Strong match on Node and SQLite.

WARNING: source linkedin was throttled: refused after 3 retries and 1 min of waiting. 12 vacancies were not judged because of it.

COVERAGE REPORT
Source: linkedin
  Read: 20
    Dropped for date:           1
    Dropped for salary:         0
    Skipped, already seen:      5
    Skipped, reposts:           1
    Not judged:                12
      source.throttled:        12
    Judged:                     1
  Kept without a stated salary: 3   (counted within the buckets above)
  Kept without a stated date:   0   (counted within the buckets above)
Judgments made: 1 of a limit of 30
Duration: 1 min 41 s
RUN FAILED: source linkedin was throttled
```

Exit status `1`.

### 8.4 Nothing new

```
No new vacancies. Read 30, skipped 24 already seen and 2 reposts, dropped 4.

COVERAGE REPORT
Source: linkedin
  Read: 30
    Dropped for date:           3
    Dropped for salary:         1
    Skipped, already seen:     24
    Skipped, reposts:           2
    Not judged:                 0
    Judged:                     0
  Kept without a stated salary: 0   (counted within the buckets above)
  Kept without a stated date:   0   (counted within the buckets above)
Judgments made: 0 of a limit of 30
Duration: 0 min 09 s
```

Exit status `0`.
