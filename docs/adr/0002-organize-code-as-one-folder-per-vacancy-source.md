---
status: Accepted
owner: "Serhii Lyzun"
reviewers: []
updated_at: "2026-09-19"
feature_size: "n/a (repo foundation)"
ticket: ""
---

# 0002 — Organize code as one folder per vacancy source behind a shared vacancy shape

- **Status:** Accepted
- **Date:** 2026-09-19
- **Deciders:** Serhii Lyzun, with Claude during the survey foundation session

## Context

The owner named "multi-site in the future" as the main pain (`docs/idea-brief.md` §2): LinkedIn is the first source, company career pages are the chosen next one. Each site is built differently, but everything after reading a page (CV matching, seen-memory, the report) should not care which site a vacancy came from. The code layout has to decide where that line sits.

## Decision drivers

- Adding a second source should be "add one folder", not a refactor (`docs/idea-brief.md` §2, §7).
- A source that fails or returns nothing must surface as a clear error so the coverage report can warn loudly (`docs/idea-brief.md` §6, §7).
- Sources must be testable offline against saved pages, since the live site is fragile and against its terms.

## Considered options

1. **One folder per source behind a shared interface** — every source returns the same vacancy shape and raises the same typed errors; matching, storage and reporting only see that shape.
2. **LinkedIn code written inline, split out when a second site arrives** — fastest first version, but the split happens under pressure and the vacancy shape ends up LinkedIn-shaped.
3. **Full layered (hexagonal) architecture with domain, application and infrastructure layers** — clean, but heavy for a tool of this size.

## Decision outcome

**Chosen:** Option 1. Three small interfaces (a vacancy source, a fit judge, a seen-store) are the seams; everything else is plain modules. It serves the multi-site direction directly without the ceremony of full layering.

## Consequences

**Positive**
- A second site or a company career page is one new folder plus a registration line.
- Failures are typed, so the coverage report can tell "blocked" from "no results".
- Tests use saved pages and a fake judge, with no network.

**Negative**
- The shared vacancy shape must be designed before the second source exists, so it may need adjusting when it arrives.

**Neutral**
- If the tool stays LinkedIn-only, the one-folder-per-source layout costs almost nothing.

## Links

- Idea brief: [[../idea-brief.md]] §2, §6, §7
- Map: [[../architecture-map.md]] (Module inventory)
- Related ADR: [[0001-use-typescript-on-node-22]], [[0003-keep-seen-memory-in-a-local-sqlite-file]]
