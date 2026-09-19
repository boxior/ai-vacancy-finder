---
status: Accepted
owner: "Serhii Lyzun"
reviewers: []
updated_at: "2026-09-19"
feature_size: "L"
ticket: ""
---

# 0005 — Run the search pipeline in its own module with adapters passed in

- **Status:** Accepted
- **Date:** 2026-09-19
- **Deciders:** Serhii Lyzun, with Claude during the design pass

## Context

`docs/architecture-map.md` gives `src/cli.ts` the job of parsing inputs, loading the CV, running the search pipeline and setting the exit code. `src/cli.ts` is already the composition root, the one place where concrete adapters are wired, and it is the process entry point, which sets `process.exitCode` as soon as it is imported. The pipeline of `sad.md` §4 has eight steps and touches all three seams. Where it lives decides whether an acceptance criterion can be checked offline with a fake source, a fake judge, a real in-memory SQLite database and a fake clock.

## Decision drivers

- Offline tests: every acceptance criterion checked without a network and without spawning a process (`CLAUDE.md` Rules; spec §6 measurements use fake clocks and fake judges).
- The rule that concrete adapters are wired once, in `src/cli.ts` (repo ADR `docs/adr/0002-organize-code-as-one-folder-per-vacancy-source.md`).
- The pipeline touches all three seams, so its home is shared by every seam's tests.

## Considered options

1. **A new `src/search/` module** — `runSearch(input, {source, judge, store, clock})` returns a run result; `src/cli.ts` only parses arguments, reads the CV, wires the adapters, prints and sets the exit status.
2. **Keep the pipeline in `src/cli.ts`** — as the map says, next to argument parsing and wiring.

## Decision outcome

**Chosen:** Option 1. Tests call `runSearch` with fakes and cover each acceptance criterion in-process, and the composition root stays a place where things are only wired.

## Consequences

**Positive**
- Every acceptance criterion is testable offline, in-process, against fakes.
- `src/cli.ts` stays small and free of pipeline logic.

**Negative**
- One more module than the map lists; the map needs a refresh by the next `survey`.
- One more level of indirection when navigating the code.

**Neutral**
- If the tool stays a single-source tool, `search/` is one file.

## Links

- Spec: [[../spec.md]] (§6, all AC)
- SAD: [[../sad.md]] §5
- Related ADR: [[0001-read-sources-in-two-phases-hydrating-lazily]], [[0006-share-one-polite-http-client-across-sources-with-an-injected-clock]]
