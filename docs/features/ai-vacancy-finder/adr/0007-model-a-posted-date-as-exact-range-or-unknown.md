---
status: Accepted
owner: "Serhii Lyzun"
reviewers: []
updated_at: "2026-09-19"
feature_size: "L"
ticket: ""
---

# 0007 — Model a posted date as exact, a range, or unknown

- **Status:** Accepted
- **Date:** 2026-09-19
- **Deciders:** Serhii Lyzun, with Claude during the design pass

## Context

A card and a hydrated vacancy are the same object at different stages (ADR 0001), and the posted date is often only a rough age such as "2 weeks ago". The specification drops a vacancy whose age certainly falls before the posted-since date, keeps one that could fall on either side with the tag "date approximate", and keeps one with no date at all with the tag "date not listed" (AC-15, AC-15b). Judging under the limit goes newest first by the best estimate of the date (AC-21). The shape is seen by sources, filters, the pipeline, the judge and the report.

## Decision drivers

- AC-15 and AC-15b: drop only when certainly older; keep and tag otherwise.
- AC-21: newest-first ordering needs a best estimate of the date, with undated vacancies last.
- A hydrated and a not-yet-hydrated vacancy must be handled by the same seen, repost and limit code (ADR 0001).
- What the real pages show is still open (`sad.md` §11), so the shape must fit any of the outcomes.

## Considered options

1. **One `Vacancy` type filled progressively, with `PostedDate` as exact, range or unknown** — the description is empty until hydration; a range holds the earliest and latest possible dates; a salary is a minimum and maximum with a currency and a period.
2. **Two types (`VacancyCard`, `Vacancy`) and one estimated date with an `approximate` flag** — the type guarantees a hydrated vacancy has its description, and the date is a single value plus a flag.

## Decision outcome

**Chosen:** Option 1. AC-15 and AC-15b become interval arithmetic (drop only when even the latest possible date is before the window; tag approximate when the range straddles it), and the code that skips or orders vacancies does not care whether a vacancy has been hydrated.

## Consequences

**Positive**
- The date rules are a few lines over intervals and cover exact, approximate and missing dates uniformly.
- One type flows through the whole pipeline.

**Negative**
- The description is optional, so code that reads it must check; the type makes that visible.
- Turning "2 weeks ago" into a range needs the site's real granularity, which is the open question about the real pages.

**Neutral**
- The order of the middle of a range is a best estimate, not a fact; the report never presents it as one.

## Links

- Spec: [[../spec.md]] (AC-15, AC-15b, AC-21)
- SAD: [[../sad.md]] §5
- Related ADR: [[0001-read-sources-in-two-phases-hydrating-lazily]]
