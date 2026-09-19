---
status: Accepted
owner: "Serhii Lyzun"
reviewers: []
updated_at: "2026-09-19"
feature_size: "L"
ticket: ""
---

# 0003 — Record one disposition per read vacancy and derive the report from them

- **Status:** Accepted
- **Date:** 2026-09-19
- **Deciders:** Serhii Lyzun, with Claude during the design pass

## Context

The coverage report must state, for each source, how many vacancies were read and how each one was accounted for: dropped for date, dropped for salary, skipped as already seen, skipped as reposts, not judged with the reason, or judged, each in exactly one bucket so that the buckets add up to the read count (AC-10). Every run must end with the report, including failed runs (spec §6, 100% of runs). A total that does not add up is the same kind of silent error the tool exists to prevent.

## Decision drivers

- Quality goal 1, auditable runs (`sad.md` §1).
- The bucket sum equals the read count in every run (AC-10), and the report exists even when the run failed (AC-11, spec §6).
- New reasons for leaving a vacancy out must not be forgettable in the report.
- The contract is shared by the pipeline and the report.

## Considered options

1. **One disposition per read vacancy; the report derives from them** — every read vacancy carries exactly one final value (`dropped_date`, `dropped_salary`, `seen`, `repost`, `not_judged` with a reason, `judged`) assigned in the AC-10 order; the report counts them and checks that the sum equals the read count; the search function always returns a result, turning an unexpected exception into a "RUN FAILED" entry and every unfinished vacancy into `not_judged`.
2. **Running counters** — each branch of the pipeline increments a counter (`droppedDate++`, `seen++`) and the report prints them.

## Decision outcome

**Chosen:** Option 1. The sum equals the read count by construction, and adding a new disposition is a compile-time change to every place that renders or counts one.

## Consequences

**Positive**
- "Adds up to the read count" holds by construction and is checked at report time.
- A crash in the middle of a run still yields a truthful report: unfinished vacancies are reported as not judged with the cause.
- An exhaustive `switch` over dispositions keeps a new reason out of the "unreported" gap.

**Negative**
- Every exit path of the pipeline must assign a disposition; a vacancy that ends a run without one is an internal error that the report shows and that marks the run failed.
- Slightly more ceremony than incrementing a counter.

**Neutral**
- The per-vacancy records live in memory for the length of a run (tens to hundreds of items); nothing is stored.

## Links

- Spec: [[../spec.md]] (AC-10, AC-11, §6)
- SAD: [[../sad.md]] §4
- Related ADR: [[0001-read-sources-in-two-phases-hydrating-lazily]], [[0002-return-source-failures-as-values-alongside-partial-results]]
