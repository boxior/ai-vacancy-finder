---
status: Draft
owner: "Serhii Lyzun"
reviewers: []
updated_at: "2026-09-19"
feature_size: "L"
target_surfaces: []
---

# Software Architecture Document — ai-vacancy-finder

## 1. Introduction and goals

**Intent.** A personal command-line tool for one job seeker. For a position, a salary range, a posted-since date and a location, it reads a source's public vacancy pages (LinkedIn first, no sign-in), judges each new vacancy against the job seeker's own CV with Claude, and prints apply links ordered by fit with a one-line reason. Every run ends with a coverage report that says what was read, dropped, judged and left unjudged, so a quiet or partial read never looks like "no jobs for you".

**Top-3 quality goals (1-liners; full scenarios in §10):**

1. **Auditable runs** — every run ends with a coverage report and never prints a bare empty list; a blocked, throttled, partial or empty read is loud (100% of runs end with a coverage report).
2. **Bounded cost and polite pace** — at most the judging limit (default 30) judgments per search, at most 1 page request per second toward each source, at most 5 min p95 per search.
3. **Seen-memory correctness** — each vacancy is shown once and a repost is recognised as already seen (0 vacancies listed twice across consecutive same-detail searches).

**Stakeholders.**

| Role | Interest | Sign-off owner? |
|---|---|---|
| Job seeker | Runs searches, reads the fit-sorted links and the coverage report, owns and approves this SAD | Yes |

## 2. Constraints

<!-- pending -->

## 3. Context and scope

<!-- pending -->

## 4. Solution strategy

<!-- pending -->

## 5. Building block view

<!-- pending -->

## 6. Runtime view

<!-- pending -->

## 7. Deployment view

<!-- pending -->

## 8. Crosscutting concepts

<!-- pending -->

## 9. Architecture decisions

<!-- pending -->

## 10. Quality requirements

<!-- pending -->

## 11. Risks and technical debt

<!-- pending -->

## 12. Glossary

<!-- pending -->
