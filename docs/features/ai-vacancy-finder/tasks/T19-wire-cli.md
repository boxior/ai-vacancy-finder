---
id: T19
title: "Wire the adapters in src/cli.ts and set the output streams and exit status"
layer: "wiring"
deps: ["T6", "T8", "T11", "T15", "T17", "T18"]
blocks: ["T20"]
acs: ["AC-01", "AC-11"]
files_hint: ["src/cli.ts", "test/cli.test.ts", "test/smoke.test.ts"]
owner: "Serhii Lyzun"
estimate: "M"
context_budget: "M"
status: "todo"
---

<!-- To the executing agent: work from what is inlined here. If a slice is insufficient, ambiguous,
or contradicts the code in front of you, open the named file for the full text and follow that.
Do not invent the missing part. Every inline is a snapshot with a provenance signature; the source wins. -->

# T19 — Wire the adapters in src/cli.ts and set the output streams and exit status

## Place in the sequence

- **Blocked by:** T6 — Implement the SQLite seen-store and the opener that creates or refuses the database, T8 — Implement the Claude fit judge: rubric prompt, schema-checked answer, failure classes, T11 — Parse LinkedIn detail pages, assemble the LinkedIn source and register it, T15 — Handle judge failures, unexpected errors, an unusable memory and a failed print in runSearch, T17 — Render the coverage report, the loud warnings and the whole result document, T18 — Implement preflight: argument parsing, input validation, CV, key and the contact notice · **Blocks:** T20 — Add the cross-cutting offline acceptance tests for the quality scenarios · **Wave:** 8, its last dependency, T15, sits in wave 7.
- **Lane:** Own lane.

## Why (user story)

> **As a** Job seeker
> **I want** to run a search with my position, salary range, posted-since date, location or remote, and CV
> **So that** I get the relevant public vacancies without visiting sites by hand
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task is the composition root that turns a command line into a real run: it wires the concrete source, judge and store, prints one result document and exits with the right status.

## Inlined context

> Three small interfaces are the only extension points. Concrete adapters are wired once, in `src/cli.ts`.
>
> — `CLAUDE.md §The three seams, wiring rule, verbatim` · full text: [CLAUDE.md](../../../../CLAUDE.md)

> **Chosen:** Option 1. Tests call `runSearch` with fakes and cover each acceptance criterion in-process, and the composition root stays a place where things are only wired.
>
> — `adr/0005 §Decision outcome, chosen option, verbatim` · full text: [adr/0005](../adr/0005-run-the-search-pipeline-in-its-own-module-with-adapters-passed-in.md)

> | Concept | Convention | Where defined |
> |---|---|---|
> | Output and exit status | The whole result (list, loud warnings, coverage report) is one document on stdout, so a warning above the report survives redirection to a file. Invalid input, an unreadable CV or a missing key writes a plain message to stderr, exits 2 and reads nothing. A failed run (a source blocked, throttled, failed or empty; an AI service failure; an accounting mismatch; an unusable database) puts a `RUN FAILED` line in the coverage report and exits 1. A partial-read warning alone, or "no new vacancies", exits 0. | here; command contract at the `api` stage |
>
> — `sad.md §8, «Output and exit status», verbatim` · full text: [sad.md](../sad.md)

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

> ```
> ai-vacancy-finder --position <text> --cv <path> [filters] [run options]
> node dist/cli.js  --position <text> --cv <path> [filters] [run options]
> ```
>
> […]
>
> | Status | Meaning | When |
> |---|---|---|
> | `0` | Run completed | A run that passed preflight and did not fail: including a partial-read warning (AC-12), "no new vacancies" (AC-16), and `--help`. |
> | `1` | Run failed | The coverage report carries a `RUN FAILED` line (AC-11): a source blocked, throttled, failed or empty; the AI service stopped judging; the accounting did not add up; an unexpected error; the seen memory unusable; or the result could not be printed. |
> | `2` | Usage error | Invalid input, unknown flag, CV problem or missing key (§3 steps 1–4). Nothing was read, and the message goes to stderr only. |
>
> […]
>
> - **stdout** carries one document per completed or failed run: the vacancy list, the warnings, the coverage report, in that order (SAD §8). Redirecting stdout to a file therefore keeps every warning.
> - **stderr** carries usage errors (status 2), the CV contact notice, and the plain message when the result itself could not be printed.
> - Neither stream ever holds CV text or the AI key, in any outcome (QG-5).
>
> — `contracts/cli.md §1, 4 and 5.1, synopsis, exit statuses, streams, abridged` · full text: [cli.md](../contracts/cli.md)

## Acceptance criteria

### AC-01 — happy path

> **Given** the job seeker has a readable CV and gives a position, a salary range, a posted-since date and a location or remote
> **When** the job seeker runs the search
> **Then** the system reads the source's public vacancy pages, prints apply links to the vacancies that passed the filters, and ends with a coverage report
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-11 — domain invariant

> **Given** a source was blocked, failed, was throttled, or returned no vacancies at all
> **When** the search completes
> **Then** the system never prints a bare empty list: it prints a loud warning naming the source and whether it was blocked, failed, throttled or returned nothing, above the coverage report, and marks the run as failed, meaning the run ends with a non-zero exit status and a "RUN FAILED" line in the coverage report; a run that read at least one vacancy and lists none because all were already seen, reposts or dropped by the filters is not failed and ends with the message of AC-16
>
> — `spec.md §5, AC-11, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `src/cli.ts`: keep it the composition root and the `bin` entry (`package.json` `bin` still points to `dist/cli.js`); export `main(argv, env, io)` so tests can call it without the process-exit side effect — guard the entry line or split a tiny entry module, as long as `node dist/cli.js` keeps working
- [ ] Flow: `runPreflight` (T18) — usage errors to stderr, exit 2, nothing read; the contact notice to stderr; then build the real adapters — the LinkedIn source from the registry (T11), `createClaudeJudge` over an Anthropic client made from `ANTHROPIC_API_KEY` with `--model` (T8), `openSeenStore` with `--db` (T6), `systemClock` — and call `runSearch` (T13–T15) with `present` writing `renderDocument(result)` (T17) to stdout
- [ ] Exit status: 0 for a run that did not fail, 1 for a failed run, 2 for a usage error; a failed print writes a plain message to stderr and exits 1
- [ ] Update the `--help` text to list every flag of cli.md §2; `--help` prints usage on stdout and exits 0
- [ ] The key is never printed, logged or written; no `.env` loading
- [ ] `test/cli.test.ts`: `main` with injected fake adapters through the real preflight and report — statuses 0, 1 and 2 and the streams; keep `test/smoke.test.ts` (`--help` exits 0 with 'Usage:', `--bogus` exits 2 naming `--bogus`) passing

## Edge cases

| Case | Behaviour |
|---|---|
| A usage error | stderr only, exit 2, no request made, nothing marked seen |
| A failed run | stdout holds the warning, the coverage report and `RUN FAILED`; exit 1 |
| A partial-read warning only | exit 0 |
| 'No new vacancies' | exit 0 |
| The result cannot be printed | a plain message on stderr, exit 1, nothing marked seen |
| `--db` points at an unusable database | a failed run that is reported (exit 1), not a usage error (exit 2) |
| Ctrl-C | not specified; nothing is marked seen before printing completes, so the safe direction holds |

## Definition of Done

- [ ] `main` tests pass for statuses 0, 1 and 2 and for stdout/stderr separation
- [ ] `npm test` (including the smoke tests against the built `dist/cli.js`) is green
- [ ] concrete adapters are constructed only in `src/cli.ts`
- [ ] every Hard Rule inlined above still holds
- [ ] `npm run lint` and `npm run build` clean (the per-task gate)
