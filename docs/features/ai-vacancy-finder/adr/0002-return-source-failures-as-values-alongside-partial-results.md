---
status: Accepted
owner: "Serhii Lyzun"
reviewers: []
updated_at: "2026-09-19"
feature_size: "L"
ticket: ""
---

# 0002 — Return source failures as values alongside partial results

- **Status:** Accepted
- **Date:** 2026-09-19
- **Deciders:** Serhii Lyzun, with Claude during the design pass

## Context

A source can read two pages of results normally and then be throttled on the third, or be blocked at the very first page, or return nothing. The specification requires that what was read before a throttle is still listed (AC-23), that the run is marked failed with the cause named above the coverage report (AC-11), and that a sign-in page is reported as blocked and never bypassed (AC-04). The vacancies read so far and the reason the source stopped therefore have to reach the pipeline together. The repo rule in `CLAUDE.md` says a failing or empty source "raises a typed error that the coverage report shows".

## Decision drivers

- Partial results must survive a failure (AC-23).
- Nothing is swallowed: every stop reason reaches the coverage report (`CLAUDE.md` Rules; goal 1 in `sad.md` §1).
- TypeScript does not check the types of thrown errors, so a handled-by-convention error is easy to forget.
- The contract is shared by every source, the pipeline and the report.

## Considered options

1. **Return an outcome value with a typed stop** — `list()` returns `{cards, expectedCount?, stop?}` where `stop` is `blocked`, `throttled`, `failed` or `empty` plus a detail; `hydrate()` returns a vacancy or a typed failure. Expected conditions never throw; an unexpected exception is caught by the pipeline and mapped to `failed`.
2. **Throw a typed error carrying the partial result** — `list()` returns cards on success and throws `SourceThrottled({partial})` and its siblings otherwise.

## Decision outcome

**Chosen:** Option 1. The partial result and the cause travel in one value, so AC-23 needs no special path, and the compiler forces every stop kind to be handled.

## Consequences

**Positive**
- The vacancies read before a stop and the reason for it cannot be separated.
- An exhaustive `switch` over the stop kinds means a new kind cannot be forgotten in the report.

**Negative**
- The wording of `CLAUDE.md` ("raises a typed error") no longer matches; it needs a one-sentence update when this is implemented. Design does not edit `CLAUDE.md`.
- A caller can still ignore `stop`; the mitigation is a test that every stop kind appears in the report, plus ADR 0003, which derives the report from the vacancies' dispositions.
- Genuinely unexpected exceptions (a parser bug, a library error) still exist and are caught at one place in the pipeline.

**Neutral**
- An adapter written with throw-style internals can wrap them at its boundary.

## Links

- Spec: [[../spec.md]] (AC-04, AC-11, AC-23)
- SAD: [[../sad.md]] §4
- Related ADR: [[0001-read-sources-in-two-phases-hydrating-lazily]], [[0003-record-one-disposition-per-read-vacancy-and-derive-the-report]]
