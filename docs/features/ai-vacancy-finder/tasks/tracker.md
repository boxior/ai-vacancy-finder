# Tracker — ai-vacancy-finder

> Status of every task in the epic. `implement` updates `done` as it commits each task.
> States: `todo` · `in_progress` · `blocked` · `review` · `done`.

| # | Task | Layer | Owner | Estimate | Blocked by | Status |
|---|---|---|---|---|---|---|
| T1 | Define the vacancy shape, the search input type, the clock and the repost fingerprint | domain | Serhii Lyzun | M | — | todo |
| T2 | Implement the date and salary filters and their tags as pure rules | domain | Serhii Lyzun | M | T1 | todo |
| T3 | Define the disposition set, the run result and the accounting check | domain | Serhii Lyzun | M | T1 | todo |
| T4 | Define the three seam interfaces with their typed failures, the test fakes, and fix the fail-loudly wording | domain | Serhii Lyzun | M | T1, T3 | todo |
| T5 | Promote the staged shown_vacancy migration into the live migrations | migration | Serhii Lyzun | S | — | todo |
| T6 | Implement the SQLite seen-store and the opener that creates or refuses the database | infra | Serhii Lyzun | M | T1, T4, T5 | todo |
| T7 | Build the shared polite HTTP client: pace, back-off and typed refusals | infra | Serhii Lyzun | M | T1, T4 | todo |
| T8 | Implement the Claude fit judge: rubric prompt, schema-checked answer, failure classes | infra | Serhii Lyzun | M | T1, T4 | todo |
| T9 | Save real public LinkedIn pages as fixtures and record what they show | tests | Serhii Lyzun | S | — | todo |
| T10 | Parse LinkedIn results pages into cards and list them with typed stops | infra | Serhii Lyzun | M | T1, T4, T7, T9 | todo |
| T11 | Parse LinkedIn detail pages, assemble the LinkedIn source and register it | infra | Serhii Lyzun | M | T4, T7, T9, T10 | todo |
| T12 | Classify cards: drop, skip seen and reposts, and order the candidates | app | Serhii Lyzun | M | T1, T2, T3, T4 | todo |
| T13 | Implement runSearch: list, classify, hydrate and judge under the limit, present, mark seen | app | Serhii Lyzun | M | T2, T3, T4, T12 | todo |
| T14 | Handle source stops and partial reads in runSearch | app | Serhii Lyzun | M | T13 | todo |
| T15 | Handle judge failures, unexpected errors, an unusable memory and a failed print in runSearch | app | Serhii Lyzun | M | T14 | todo |
| T16 | Render the fit-sorted vacancy list with its tags and marks | app | Serhii Lyzun | S | T1, T3 | todo |
| T17 | Render the coverage report, the loud warnings and the whole result document | app | Serhii Lyzun | M | T3, T16 | todo |
| T18 | Implement preflight: argument parsing, input validation, CV, key and the contact notice | ports | Serhii Lyzun | M | T1 | todo |
| T19 | Wire the adapters in src/cli.ts and set the output streams and exit status | wiring | Serhii Lyzun | M | T6, T8, T11, T15, T17, T18 | todo |
| T20 | Add the cross-cutting offline acceptance tests for the quality scenarios | tests | Serhii Lyzun | M | T19 | todo |

**Total:** 20 tasks, ~9.25 person-days (S = 0.25, M = 0.5).
