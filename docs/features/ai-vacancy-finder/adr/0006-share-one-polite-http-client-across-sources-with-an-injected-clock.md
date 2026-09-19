---
status: Accepted
owner: "Serhii Lyzun"
reviewers: []
updated_at: "2026-09-19"
feature_size: "L"
ticket: ""
---

# 0006 — Share one polite HTTP client across sources, with an injected clock

- **Status:** Accepted
- **Date:** 2026-09-19
- **Deciders:** Serhii Lyzun, with Claude during the design pass

## Context

The specification limits the pace to at most 1 page request per second toward each source, counted for each source separately, and limits back-off to at most 3 retries per refused request and at most 1 minute of total waiting per source, after which the source is reported as throttled (spec §6, AC-23). Both are measured offline against a fake clock. More sources follow LinkedIn (company career pages are the chosen next step), each built differently but all bound by the same limits. A source that lacks a limiter would hit someone else's site with no pause.

## Decision drivers

- At most 1 page request per second per source, and at most 3 retries and 1 minute of total waiting per source (spec §6).
- Throttling and blocking are expected (AC-04, AC-23); the tool must never retry in a tight loop.
- Offline tests against a fake clock (spec §6).
- Adding a source stays "add one folder" (repo ADR `docs/adr/0002-organize-code-as-one-folder-per-vacancy-source.md`).

## Considered options

1. **One shared client with an injected `Clock`** — `src/sources/http.ts` creates one client per source with its own pace counter; it holds requests to at most one per second, retries up to 3 times with growing pauses within 1 minute in total, and maps refusals to the typed stop kinds. Each adapter passes in a small classifier that says what its site's sign-in wall or refusal looks like. `Clock` (now, sleep) is injected so tests advance time instantly.
2. **Each source owns its own pacing and back-off** — the adapter manages its own delays and retries.

## Decision outcome

**Chosen:** Option 1. Pace and back-off are written and tested once, so a new source cannot forget them, and the numbers of spec §6 live in one place.

## Consequences

**Positive**
- The pace and back-off limits are implemented and proven once, against a fake clock.
- A new source gets polite behaviour by construction.

**Negative**
- Adapters depend on a shared helper; a source with unusual needs (for example a real browser instead of `fetch`) has to work around it.
- Site-specific signs of a block still live in each adapter's classifier.

**Neutral**
- The `Clock` interface is also used by the pipeline for the run duration in the coverage report.

## Links

- Spec: [[../spec.md]] (AC-04, AC-23, §6)
- SAD: [[../sad.md]] §5
- Related ADR: [[0001-read-sources-in-two-phases-hydrating-lazily]], [[0002-return-source-failures-as-values-alongside-partial-results]], [[0005-run-the-search-pipeline-in-its-own-module-with-adapters-passed-in]]
