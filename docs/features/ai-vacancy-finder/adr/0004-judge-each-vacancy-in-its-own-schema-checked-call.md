---
status: Accepted
owner: "Serhii Lyzun"
reviewers: []
updated_at: "2026-09-19"
feature_size: "L"
ticket: ""
---

# 0004 — Judge each vacancy in its own schema-checked call

- **Status:** Accepted
- **Date:** 2026-09-19
- **Deciders:** Serhii Lyzun, with Claude during the design pass

## Context

The fit judge is the second seam: the CV and one vacancy go in; a fit from 1 to 10, a one-line reason and whether the vacancy text contained instructions come out. The specification requires that a failure on one vacancy does not stop the others (AC-07), that a rejected key, an exhausted allowance or an unreachable service stops judging loudly (AC-07b), that vacancy text is treated as data (AC-09), and that the same vacancy and CV judged twice differ by at most 1 point in at least 90% of pairs (spec §6).

## Decision drivers

- Failure isolation per vacancy (AC-07) and a loud stop on service-level failures (AC-07b).
- Fit consistency: at most 1 point apart in at least 90% of pairs (spec §6).
- At most the judging limit (default 30) judgments per search and at most 5 min p95 per search (spec §6).
- Vacancy text is untrusted and may try to instruct the judge (AC-09; spec §6.1).
- The CV is confidential and leaves the machine with each judgment (spec §6.1).

## Considered options

1. **One call per vacancy, schema-checked, with two failure classes** — a system prompt carrying a 1–10 rubric with anchor descriptions, then the CV, then one vacancy inside a delimited block marked as untrusted data. The answer is forced into `{fit, reason, containsInstructions}` and validated with `zod`. An unusable answer marks that vacancy "not judged" with a reason and the run continues; a rejected key, no allowance left or an unreachable service (after the SDK's built-in retries) stops judging, warns loudly and marks the run failed. The default model is `claude-sonnet-5`, overridable by a flag.
2. **Batched calls** — the CV and 5–10 vacancies in one request, asking for an array of judgments.

## Decision outcome

**Chosen:** Option 1. Each vacancy is judged independently against one rubric, which favours consistency, and a failure or an injection attempt in one vacancy cannot touch its neighbours.

## Consequences

**Positive**
- Failures are isolated per vacancy; service-level failures stop the run at the first occurrence.
- The judge is easy to test with a fake and the schema check rejects malformed answers.

**Negative**
- One call per vacancy means the whole CV is sent up to 30 times per search, and sequential calls of an estimated 3–6 s each are the largest part of the 5-minute budget; prompt caching may not apply to a short CV and is not relied on.
- The model choice affects cost and consistency: Haiku 4.5 is cheaper and faster but may judge fine differences less steadily.

**Neutral**
- Running two or three calls at once is a later lever if latency threatens the budget; the seam does not change.
- Batching can be adopted later at the cost of per-vacancy isolation.

## Links

- Spec: [[../spec.md]] (AC-07, AC-07b, AC-09, §6, §6.1)
- SAD: [[../sad.md]] §4
- Related ADR: [[0001-read-sources-in-two-phases-hydrating-lazily]], [[0003-record-one-disposition-per-read-vacancy-and-derive-the-report]]
