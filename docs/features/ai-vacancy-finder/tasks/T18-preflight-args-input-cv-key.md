---
id: T18
title: "Implement preflight: argument parsing, input validation, CV, key and the contact notice"
layer: "ports"
deps: ["T1"]
blocks: ["T19"]
acs: ["AC-02", "AC-03", "AC-05"]
files_hint: ["src/preflight.ts", "src/domain/search-input.ts", "test/preflight.test.ts", "test/domain/search-input.test.ts"]
owner: "Serhii Lyzun"
estimate: "M"
context_budget: "M"
status: "todo"
---

<!-- To the executing agent: work from what is inlined here. If a slice is insufficient, ambiguous,
or contradicts the code in front of you, open the named file for the full text and follow that.
Do not invent the missing part. Every inline is a snapshot with a provenance signature; the source wins. -->

# T18 — Implement preflight: argument parsing, input validation, CV, key and the contact notice

## Place in the sequence

- **Blocked by:** T1 — Define the vacancy shape, the search input type, the clock and the repost fingerprint · **Blocks:** T19 — Wire the adapters in src/cli.ts and set the output streams and exit status · **Wave:** 2, its last dependency, T1, sits in wave 1.
- **Lane:** Shares `src/domain/search-input.ts` with T1 (which only wrote the type) — serialized after it. `src/cli.ts` is left to T19.

## Why (user story)

> **As a** Job seeker
> **I want** to run a search with my position, salary range, posted-since date, location or remote, and CV
> **So that** I get the relevant public vacancies without visiting sites by hand
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task stops a bad search before anything is read, saying in plain language which input, CV or key is wrong and how to fix it.

## Inlined context

> | Concept | Convention | Where defined |
> |---|---|---|
> | Configuration | Flags only, no config file in v1: position, salary range, posted-since date, location or remote-only, CV path, judging limit, model, database path, show everything. Names and defaults are fixed by the `api` stage. | here |
> | Privacy of the CV | The CV text is sent as it is to the Claude API with each judgment and is never logged, printed or stored; the seen memory holds only identity and repost fingerprint. Preflight looks for email and phone patterns and, if found, prints one warning that contact details in the CV go to the AI service with every judgment, then continues. It never prints the matched text. This is a reminder, not protection: names, addresses and handles are not detected, so a contact-free copy remains the job seeker's duty. | spec §6.1, here |
>
> — `sad.md §8, «Configuration» and «Privacy of the CV», verbatim` · full text: [sad.md](../sad.md)

> **Secrets.** The AI key comes from the `ANTHROPIC_API_KEY` environment variable. Never commit a key or a `.env` file (both are gitignored).
>
> — `CLAUDE.md §Rules, Secrets, verbatim` · full text: [CLAUDE.md](../../../../CLAUDE.md)

> - CV or key leaking into output: the tool never prints CV text or the key, in the list, the coverage report or an error.
>
> — `spec.md §6.1, abuse case, CV or key leaking, verbatim` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full ([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) · [cli.md](../contracts/cli.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no HTTP API; the command line is the surface. Slices of the CLI contract:

> | Flag | Value | Required | Default | Meaning | Origin |
> |---|---|---|---|---|---|
> | `--position` | text | **yes** | — | The job position to search for. | US-01, AC-02 |
> | `--salary-min` | integer ≥ 0 | no | none (open end) | Lower end of the yearly salary range. | US-04, AC-13 |
> | `--salary-max` | integer ≥ 0 | no | none (open end) | Upper end of the yearly salary range. | US-04, AC-13 |
> | `--currency` | 3 letters (ISO 4217), case-insensitive, stored upper-case | **only with a salary bound** | — | Currency of the range. The period is always one year and is not a flag. | SAD §2 (pay comparability); `# unresolved` OQ-1 |
> | `--posted-since` | `YYYY-MM-DD` | no | none (no date filter) | Earliest posted date to keep. | US-04, AC-02, AC-15 |
> | `--location` | text | no | none (the source's default scope) | One place to search in. | SAD §2 (settled from spec §8) |
> | `--remote` | switch | no | off | Remote-only. May be combined with `--location`. | SAD §2 (settled from spec §8) |
> | `--cv` | path | **yes** | — | The job seeker's CV: a `.txt` or `.md` file (extension compared case-insensitively). | US-01, AC-03 |
> | `--judging-limit` | integer ≥ 1 | no | `30` | The most vacancies this search may send to fit judgment. Every fit-judge call counts, including one that ends "unusable answer". | US-07, AC-02, AC-21, §6 |
> | `--model` | text | no | `claude-sonnet-5` | Claude model used to judge fit. | ADR 0004 |
>
> […]
>
> Validation (each failure is a usage error, exit 2, see §4):
> - `--position` is non-empty after trimming.
> - `--salary-min` and `--salary-max` are whole numbers ≥ 0. When both are given, `--salary-min` ≤ `--salary-max` (AC-02: a lower end above the upper end is invalid). One bound alone is an open-ended range: "from X" is X and up, "up to X" is 0 to X, the same reading AC-13 applies to a vacancy's pay.
> - `--currency` is required when either salary bound is given, and is invalid without one (it would have no effect, and an ignored flag is a swallowed input).
> - `--posted-since` is a real calendar date, and is not after today. Today is the machine's local date from the injected `Clock`; today itself is allowed (AC-02).
> - `--location` is non-empty after trimming when given.
>
> […]
>
> 1. **Command line.** Unknown flag, missing flag value or positional argument → `input.unknown_option`. With no arguments at all the command reports the missing position (`input.position_missing`) and points to `--help`; it does not print help and exit 0 as the current stub does.
> 2. **Inputs.** Every problem in §2.1 and the `--judging-limit`, `--model` checks is reported together in one message, one line per problem.
> 3. **CV.** `--cv` omitted (`cv.path_missing`), file not found or unreadable (`cv.unreadable`), extension other than `.txt` / `.md` (`cv.unsupported_format`), empty or whitespace-only (`cv.empty`).
> 4. **Key.** `ANTHROPIC_API_KEY` missing or empty (`key.missing`).
> 5. **CV contact notice.** If the CV text looks like it holds an email address or a phone number, one notice goes to stderr and the run continues (§5.1). The matched text is never printed.
>
> — `contracts/cli.md §2.1, 2.2 and 3, search flags, validation, preflight order, abridged` · full text: [cli.md](../contracts/cli.md)

> | Code | Trigger | Message (template) | AC |
> |---|---|---|---|
> | `input.unknown_option` | Unknown flag, missing value, positional argument | `unknown option or argument: <arg>` | — |
> | `input.position_missing` | `--position` omitted or blank | `--position is required: say which job position to search for` | AC-02 |
> | `input.salary_invalid` | A bound is not a whole number ≥ 0 | `--salary-min/--salary-max must be whole numbers, 0 or more` | AC-02 |
> | `input.salary_range_inverted` | `--salary-min` > `--salary-max` | `--salary-min (<a>) is above --salary-max (<b>)` | AC-02 |
> | `input.currency_missing` | A salary bound without `--currency` `# unresolved` OQ-1 | `--currency is required with a salary range, for example --currency USD` | — |
> | `input.currency_unused` | `--currency` with no salary bound | `--currency has no effect without --salary-min or --salary-max` | — |
> | `input.currency_invalid` | `--currency` is not 3 letters | `--currency must be a 3-letter code such as USD or EUR` | — |
> | `input.posted_since_invalid` | Not a `YYYY-MM-DD` calendar date | `--posted-since must be a date like 2026-09-01` | AC-02 |
> | `input.posted_since_in_future` | After today | `--posted-since <d> is in the future` | AC-02 |
> | `input.judging_limit_invalid` | Not a whole number ≥ 1 | `--judging-limit must be a whole number, 1 or more` | AC-02 |
> | `input.location_blank` / `input.model_blank` | Blank value | `--location must not be blank` / `--model must not be blank` | — |
> | `cv.path_missing` | `--cv` omitted | `--cv is required: give the path to your CV (.txt or .md)` | AC-03 |
> | `cv.unreadable` | Not found, a directory, no permission | `cannot read the CV at <path>: <reason>` | AC-03 |
> | `cv.unsupported_format` | Extension not `.txt` / `.md` | `the CV format <ext> is not supported; accepted formats are .txt and .md` | AC-03 |
> | `cv.empty` | Empty or whitespace-only | `the CV file <path> is empty` | AC-03 |
> | `key.missing` | `ANTHROPIC_API_KEY` unset or empty | `ANTHROPIC_API_KEY is not set: export it in your shell, for example export ANTHROPIC_API_KEY=<your key>` | AC-05 |
>
> — `contracts/cli.md §6.1, usage error codes and messages, verbatim` · full text: [cli.md](../contracts/cli.md)

## Acceptance criteria

### AC-02 — error

> **Given** the job seeker leaves out the position, gives a salary range whose lower end is above its upper end, gives a posted-since date in the future, or gives a judging limit of zero or less
> **When** the job seeker runs the search
> **Then** the system stops before reading anything and tells the job seeker in plain language which input is invalid and why
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)

### AC-03 — error

> **Given** the CV file is missing, empty, or in a format the tool does not read (for example a word-processor or PDF document)
> **When** the job seeker runs the search
> **Then** the system stops before reading any vacancy, names the CV problem, and for an unsupported format says which formats are accepted (plain text `.txt` and Markdown `.md`)
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)

### AC-05 — authorization

> **Given** the AI access key is not available to the tool
> **When** the job seeker runs the search
> **Then** the system stops before reading any vacancy and tells the job seeker that the AI access key is missing and how to provide it, instead of printing an unjudged list
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `src/domain/search-input.ts` (extends T1's type): a `zod` schema turning the raw flag values into `SearchInput`, collecting every problem — one message line each, with the `input.*` code — and taking today's date from the `Clock`
- [ ] `src/preflight.ts`: `parseArgv(argv)` with `node:util` `parseArgs` in strict mode (`input.unknown_option` for an unknown flag, a missing value or a positional argument); `readCv(path)` accepting `.txt` and `.md` (extension compared case-insensitively) with `cv.path_missing`, `cv.unreadable`, `cv.unsupported_format`, `cv.empty`; `requireKey(env)` → `key.missing`; `cvLooksLikeContact(text)` for an email or phone pattern
- [ ] `runPreflight({ argv, env, clock, readFile })` in the order of cli.md §3: command line → inputs (all problems together) → CV → key stop the run; the contact notice is returned for the CLI to print on stderr and never contains the matched text
- [ ] Usage error lines are `error[<code>]: <message>` with the templates of cli.md §6.1; the message never holds the key or CV text
- [ ] `test/domain/search-input.test.ts` and `test/preflight.test.ts` (fake `readFile`; no real files needed except one temp file for the happy path)

## Edge cases

| Case | Behaviour |
|---|---|
| No arguments at all | `input.position_missing` with a pointer to `--help` — unlike the current stub, which prints help and exits 0 |
| `--salary-min 90000 --salary-max 80000` | `input.salary_range_inverted` |
| A salary bound without `--currency` | `input.currency_missing` — cli.md marks this `# unresolved` (OQ-1); implement as the contract says |
| `--currency` with no salary bound | `input.currency_unused` |
| `--posted-since` is today, tomorrow, or `2026-02-30` | allowed / `input.posted_since_in_future` / `input.posted_since_invalid` |
| `--judging-limit 0` | `input.judging_limit_invalid` |
| CV is a `.docx` or `.pdf` | `cv.unsupported_format`, naming `.txt` and `.md` as accepted |
| CV file missing or empty | `cv.unreadable` / `cv.empty` |
| CV holds an email or a phone number | one stderr notice, the run continues, the matched text is never printed |
| `ANTHROPIC_API_KEY` unset or empty | `key.missing`, with how to provide it |
| Several inputs invalid at once | all reported together, one line each |

## Definition of Done

- [ ] tests cover every code of cli.md §6.1 and the reporting of several problems together
- [ ] no test or code path performs a request; the key value and CV text never appear in an error (asserted)
- [ ] the CV is read only after the inputs validate
- [ ] `npm run lint` and `npm run build` clean (the per-task gate)
