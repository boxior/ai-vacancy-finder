---
id: T4
title: "Define the three seam interfaces with their typed failures, the test fakes, and fix the fail-loudly wording"
layer: "domain"
deps: ["T1", "T3"]
blocks: ["T6", "T7", "T8", "T10", "T11", "T12", "T13"]
acs: ["AC-07b", "AC-11"]
files_hint: ["src/sources/source.ts", "src/matching/judge.ts", "src/store/seen-store.ts", "test/support/fake-clock.ts", "test/support/fake-source.ts", "test/support/fake-judge.ts", "test/support/fake-seen-store.ts", "test/support/builders.ts", "CLAUDE.md"]
owner: "Serhii Lyzun"
estimate: "M"
context_budget: "M"
status: "todo"
---

<!-- To the executing agent: work from what is inlined here. If a slice is insufficient, ambiguous,
or contradicts the code in front of you, open the named file for the full text and follow that.
Do not invent the missing part. Every inline is a snapshot with a provenance signature; the source wins. -->

# T4 — Define the three seam interfaces with their typed failures, the test fakes, and fix the fail-loudly wording

## Place in the sequence

- **Blocked by:** T1 — Define the vacancy shape, the search input type, the clock and the repost fingerprint, T3 — Define the disposition set, the run result and the accounting check · **Blocks:** T6 — Implement the SQLite seen-store and the opener that creates or refuses the database, T7 — Build the shared polite HTTP client: pace, back-off and typed refusals, T8 — Implement the Claude fit judge: rubric prompt, schema-checked answer, failure classes, T10 — Parse LinkedIn results pages into cards and list them with typed stops, T11 — Parse LinkedIn detail pages, assemble the LinkedIn source and register it, T12 — Classify cards: drop, skip seen and reposts, and order the candidates, T13 — Implement runSearch: list, classify, hydrate and judge under the limit, present, mark seen · **Wave:** 3, its last dependency, T3, sits in wave 2.
- **Lane:** Own lane. New interfaces with no existing implementer, so this is not a compile-coupled contract change — T6, T8 and T10–T11 implement them later.

## Why (user story)

> **As a** Job seeker
> **I want** every run to end with a coverage report and a loud warning when a source returned nothing or only part
> **So that** a quiet or partial read never looks like "no jobs for you"
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task defines the typed values through which a source stop, a judge failure or an unusable memory reaches the report, and the fakes that every later offline test uses.

## Inlined context

> **Chosen:** Option 1. The partial result and the cause travel in one value, so AC-23 needs no special path, and the compiler forces every stop kind to be handled.
>
> […]
>
> 1. **Return an outcome value with a typed stop** — `list()` returns `{cards, expectedCount?, stop?}` where `stop` is `blocked`, `throttled`, `failed` or `empty` plus a detail; `hydrate()` returns a vacancy or a typed failure. Expected conditions never throw; an unexpected exception is caught by the pipeline and mapped to `failed`.
>
> — `adr/0002 §Decision outcome, chosen option and option 1, abridged` · full text: [adr/0002](../adr/0002-return-source-failures-as-values-alongside-partial-results.md)

> 1. **One call per vacancy, schema-checked, with two failure classes** — a system prompt carrying a 1–10 rubric with anchor descriptions, then the CV, then one vacancy inside a delimited block marked as untrusted data. The answer is forced into `{fit, reason, containsInstructions}` and validated with `zod`. An unusable answer marks that vacancy "not judged" with a reason and the run continues; a rejected key, no allowance left or an unreachable service (after the SDK's built-in retries) stops judging, warns loudly and marks the run failed. The default model is `claude-sonnet-5`, overridable by a flag.
>
> — `adr/0004 §Considered options, option 1, failure classes, verbatim` · full text: [adr/0004](../adr/0004-judge-each-vacancy-in-its-own-schema-checked-call.md)

> │   ├── source.ts              VacancySource interface (list, hydrate) and the typed stop
>
> […]
>
> │   ├── judge.ts               FitJudge interface and its failure classes
>
> […]
>
> │   ├── seen-store.ts          SeenStore interface
>
> — `sad.md §5, internal decomposition, the three seam files, abridged` · full text: [sad.md](../sad.md)

> Three small interfaces are the only extension points. Concrete adapters are wired once, in `src/cli.ts`.
>
> — `CLAUDE.md §The three seams, wiring rule, verbatim` · full text: [CLAUDE.md](../../../../CLAUDE.md)

> Store-->>Search: typed failure, the seen memory is unusable
>
> — `sad.md §6, «Critical flow 3», unusable memory, verbatim` · full text: [sad.md](../sad.md)

> | Concept | Convention | Where defined |
> |---|---|---|
> | Error handling | Expected conditions are typed values: source stops (ADR 0002) and judge failure classes (ADR 0004). `zod` validates every boundary: the search input, the CV, parsed pages and the judge's answer. One catch in the pipeline turns an unexpected exception into a failed run that is still reported. Nothing is swallowed. `CLAUDE.md` says a source "raises" a typed error; ADR 0002 keeps its spirit and needs a one-sentence wording update when implemented. | ADR 0002, ADR 0004, `CLAUDE.md` Rules |
>
> — `sad.md §8, «Error handling», verbatim` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full ([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) · [cli.md](../contracts/cli.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface of its own; the stop kinds and judge failure codes below are the names the CLI contract fixes.

> | Code | Meaning | Fails the run | AC |
> |---|---|---|---|
> | `source.blocked` | A sign-in page instead of public results; never bypassed | yes | AC-04 |
> | `source.throttled` | Refused after ≤ 3 retries and ≤ 1 min of waiting per source | yes | AC-23 |
> | `source.failed` | Error or unreadable page | yes | AC-11 |
> | `source.empty` | No vacancies at all | yes | AC-11 |
>
> […]
>
> | Code | Meaning | Fails the run |
> |---|---|---|
> | `judge.key_rejected` | The AI service rejected the key | yes (AC-07b) |
> | `judge.allowance_exhausted` | No allowance left | yes (AC-07b) |
> | `judge.unreachable` | No answer after the client's own retries | yes (AC-07b) |
> | `judge.service_rejected` | Any other non-retryable AI rejection, for example an unknown `--model` `# unresolved` OQ-2 | yes |
> | `judge.unusable_answer` | The answer was unusable or failed the schema check; only this vacancy is affected | no (AC-07) |
>
> — `contracts/cli.md §6.2, Source stops and judge codes, abridged` · full text: [cli.md](../contracts/cli.md)

## Acceptance criteria

### AC-07b — error

> **Given** the AI service rejects the AI access key, has no allowance left, or cannot be reached
> **When** the search judges vacancies
> **Then** judging stops at the first such failure, the system prints a loud warning naming the cause, marks the run as failed (AC-11), reports every vacancy not yet judged as not judged with that cause and does not mark them seen; vacancies judged before the failure are still listed
>
> — `spec.md §5, AC-07b, verbatim` · full text: [spec.md](../spec.md)

### AC-11 — domain invariant

> **Given** a source was blocked, failed, was throttled, or returned no vacancies at all
> **When** the search completes
> **Then** the system never prints a bare empty list: it prints a loud warning naming the source and whether it was blocked, failed, throttled or returned nothing, above the coverage report, and marks the run as failed, meaning the run ends with a non-zero exit status and a "RUN FAILED" line in the coverage report; a run that read at least one vacancy and lists none because all were already seen, reposts or dropped by the filters is not failed and ends with the message of AC-16
>
> — `spec.md §5, AC-11, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `src/sources/source.ts`: `VacancySource { name; list(query): Promise<ListOutcome>; hydrate(card): Promise<HydrateOutcome> }`; `ListOutcome = { cards; expectedCount?; stop? }`; `SourceStop = { kind: 'blocked' | 'throttled' | 'failed' | 'empty'; detail }`; `HydrateOutcome = { vacancy } | { stop }`; exhaustive helper over the stop kinds
- [ ] `src/matching/judge.ts`: `FitJudge { judge(cv, vacancy): Promise<JudgeOutcome> }`; `Judgment { fit (1–10 integer), reason, containsInstructions }`; `JudgeFailure` with two classes — vacancy-level `judge.unusable_answer`, and service-level `judge.key_rejected` | `judge.allowance_exhausted` | `judge.unreachable` | `judge.service_rejected` (each with a fixed `detail`)
- [ ] `src/store/seen-store.ts`: `SeenStore { findShown(ids); findFingerprints(fingerprints); markShown(rows) }`, and `SeenStoreOpener = () => { store } | { unusable: { detail } }` — the smallest way to give `runSearch` the 'opens the seen memory' step of flows 1 and 3 (ADR 0005 lists `store` among the adapters; record this form in the PR)
- [ ] `test/support/`: `FakeClock` (virtual time; `sleep` advances `now` and records the pause), `FakeSource` (scripted list and hydrate outcomes), `FakeJudge` (scripted outcomes; counts calls; records the CV it received), `FakeSeenStore` (in-memory), and `builders.ts` with `aVacancy(overrides)`
- [ ] Reword the `CLAUDE.md` rule **Fail loudly** — 'raises a typed error' becomes a source 'returns a typed stop' — the one-sentence update ADR 0002 and sad §8 call for; leave `docs/architecture-map.md` for the next `survey` (sad §11)

## Edge cases

| Case | Behaviour |
|---|---|
| A caller ignores `stop` | the compiler cannot force it; the mitigation is the accounting check (T3) and the test in T14 that every stop kind reaches the result |
| A new stop kind is added later | the exhaustive helper breaks compilation in the pipeline and the report |
| `hydrate` returns its input unchanged | allowed — a page that already carries the description costs nothing (ADR 0001) |
| `empty` stop together with cards | invalid: `empty` means no cards were read |
| An adapter uses `throw` internally | wraps it at its own boundary; anything unexpected is caught once in the pipeline (T15) |

## Definition of Done

- [ ] `npm run build` compiles with the three interfaces and the fakes (the fakes satisfy the interfaces)
- [ ] a small test shows `FakeClock.sleep` advances time instantly and `FakeJudge` counts its calls
- [ ] `CLAUDE.md` Fail loudly no longer says a source raises
- [ ] `npm run lint` and `npm run build` clean (the per-task gate)
