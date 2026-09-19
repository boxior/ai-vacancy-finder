---
id: T15
title: "Handle judge failures, unexpected errors, an unusable memory and a failed print in runSearch"
layer: "app"
deps: ["T14"]
blocks: ["T19"]
acs: ["AC-07", "AC-07b"]
files_hint: ["src/search/run-search.ts", "test/search/run-search-failures.test.ts"]
owner: "Serhii Lyzun"
estimate: "M"
context_budget: "M"
status: "todo"
---

<!-- To the executing agent: work from what is inlined here. If a slice is insufficient, ambiguous,
or contradicts the code in front of you, open the named file for the full text and follow that.
Do not invent the missing part. Every inline is a snapshot with a provenance signature; the source wins. -->

# T15 — Handle judge failures, unexpected errors, an unusable memory and a failed print in runSearch

## Place in the sequence

- **Blocked by:** T14 — Handle source stops and partial reads in runSearch · **Blocks:** T19 — Wire the adapters in src/cli.ts and set the output streams and exit status · **Wave:** 7, its last dependency, T14, sits in wave 6.
- **Lane:** Shares `src/search/run-search.ts` with T13 and T14 — serialized, last of the three.

## Why (user story)

> **As a** Job seeker
> **I want** each new vacancy judged against my CV and listed with its apply link, fit and a one-line reason
> **So that** I open the best matches first and know why they were ranked there
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task keeps one bad judgment from touching the others, stops loudly on a failing AI service, and turns any unexpected failure into a reported failed run.

## Inlined context

> **Chosen:** Option 1. Each vacancy is judged independently against one rubric, which favours consistency, and a failure or an injection attempt in one vacancy cannot touch its neighbours.
>
> — `adr/0004 §Decision outcome, chosen option, verbatim` · full text: [adr/0004](../adr/0004-judge-each-vacancy-in-its-own-schema-checked-call.md)

> Note over Search: this vacancy becomes not judged with that reason, is not a recommendation and is not marked seen, and the loop goes on with the next candidate
>
> […]
>
> Note over Search: judging stops at the first such failure and this vacancy and every unreached candidate become not judged with that cause
>
> — `sad.md §6, «Critical flow 5» and «Critical flow 6», abridged` · full text: [sad.md](../sad.md)

> Note over Search: the single catch of the pipeline turns it into a failed run with the cause unexpected error, and the message never holds CV text or the AI key
> Note over Search: every read vacancy not yet accounted for becomes not judged with that cause, then the buckets are checked against the read count and a mismatch also makes the run failed
>
> […]
>
> Note over Search: nothing is read, this is a failed run with an empty accounting
>
> […]
>
> CLI-->>Search: the presenter failed
>
> — `sad.md §6, «Cross-cutting» and «Critical flow 3», abridged` · full text: [sad.md](../sad.md)

> **Fail loudly.** A source that fails or returns nothing raises a typed error that the coverage report shows. Never swallow an error; never print an empty list without its coverage line.
>
> — `CLAUDE.md §Rules, Fail loudly, verbatim` · full text: [CLAUDE.md](../../../../CLAUDE.md)

> - CV or key leaking into output: the tool never prints CV text or the key, in the list, the coverage report or an error.
>
> — `spec.md §6.1, abuse case, CV or key leaking, verbatim` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full ([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) · [cli.md](../contracts/cli.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface of its own; codes and warning texts are the CLI contract's.

> | Code | Meaning | Fails the run |
> |---|---|---|
> | `judge.key_rejected` | The AI service rejected the key | yes (AC-07b) |
> | `judge.allowance_exhausted` | No allowance left | yes (AC-07b) |
> | `judge.unreachable` | No answer after the client's own retries | yes (AC-07b) |
> | `judge.service_rejected` | Any other non-retryable AI rejection, for example an unknown `--model` `# unresolved` OQ-2 | yes |
> | `judge.unusable_answer` | The answer was unusable or failed the schema check; only this vacancy is affected | no (AC-07) |
> | `search.unexpected_error` | An exception no typed value covers; the message never holds CV text or the key | yes |
>
> […]
>
> Run failures without a "not judged" reason: `store.unusable` (the seen memory cannot be opened, created or migrated: nothing is read, empty accounting, `RUN FAILED`, exit 1) and `output.print_failed` (the result could not be printed: plain message on stderr, nothing marked seen, exit 1).
>
> […]
>
> | Trigger | Text |
> |---|---|
> | The AI service stopped (AC-07b) | `WARNING: judging stopped: <cause>. <n> vacancies were not judged.` |
> | An unexpected error | `WARNING: unexpected error: <sanitised message>.` (never CV text or the key) |
> | Accounting mismatch | `WARNING: the coverage buckets add up to <x> but <n> vacancies were read.` (fails the run) |
>
> — `contracts/cli.md §6.2 and 5.2, run-failure codes and warnings, abridged` · full text: [cli.md](../contracts/cli.md)

## Acceptance criteria

### AC-07 — error

> **Given** the fit judgment for one vacancy fails or comes back unusable
> **When** the search completes
> **Then** that vacancy is reported as not judged with the reason, is not shown as a recommendation and is not marked seen, and the remaining vacancies are still judged and listed
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

### AC-07b — error

> **Given** the AI service rejects the AI access key, has no allowance left, or cannot be reached
> **When** the search judges vacancies
> **Then** judging stops at the first such failure, the system prints a loud warning naming the cause, marks the run as failed (AC-11), reports every vacancy not yet judged as not judged with that cause and does not mark them seen; vacancies judged before the failure are still listed
>
> — `spec.md §5, AC-07b, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Vacancy-level `judge.unusable_answer`: record the vacancy `not_judged`, count the call toward the limit, carry on with the next candidate; the run is not failed by this alone
- [ ] Service-level failures (`judge.key_rejected`, `judge.allowance_exhausted`, `judge.unreachable`, `judge.service_rejected`): stop judging at the first one, the vacancy and every unreached candidate become `not_judged` with that code, the run is failed, vacancies judged before it stay listed and are marked seen after presenting
- [ ] One `try/catch` around the pipeline body after preflight: an unexpected exception becomes a failed run with `search.unexpected_error`, every read vacancy without a disposition becomes `not_judged` with it, and the message is sanitised — redact the CV text and the AI key (pass them in `deps.secrets`) and cut it short
- [ ] After closing the accounts, check `accountingMatches` (T3): a mismatch fails the run and puts the mismatch in the result
- [ ] `openStore` returning `unusable`: nothing is read, the run is failed with `store.unusable` and an empty accounting, and `present` is still called
- [ ] `present` throwing: nothing is marked seen, the result carries `output.print_failed`, the run is failed; the CLI writes the plain message (T19)
- [ ] `test/search/run-search-failures.test.ts`

## Edge cases

| Case | Behaviour |
|---|---|
| The 3rd judgment is unusable and the others are fine | one `not_judged: judge.unusable_answer`; the rest listed; the run is not failed; the call counted (AC-07) |
| Every judgment is unusable | nothing listed and the run is not failed — T17 prints the 'could not be judged' line (cli.md OQ-3, unresolved) |
| Key rejected at the 5th call | the 5th and every unreached candidate `not_judged: judge.key_rejected`; run failed; the first 4 listed and marked seen (AC-07b) |
| An exception inside a parser during hydration | failed run `search.unexpected_error`, the result is still presented |
| The exception message contains CV text or the key | redacted before it enters the result |
| Seen memory unusable | failed run, empty accounting, presented, exit status 1 (T19) |
| Presenting fails | nothing marked seen; status failed; no second attempt to print |
| `markShown` throws after a successful print | not specified — surface it as a failed run so the CLI reports it on stderr; the vacancies come back as new; note it in the PR |

## Definition of Done

- [ ] tests cover unusable answer, each of the four service failures, an unexpected exception, an unusable store, a failing presenter and the sum check
- [ ] a sentinel CV and key never appear in the result of any failure (asserted)
- [ ] every Hard Rule inlined above still holds
- [ ] `npm run lint` and `npm run build` clean (the per-task gate)
