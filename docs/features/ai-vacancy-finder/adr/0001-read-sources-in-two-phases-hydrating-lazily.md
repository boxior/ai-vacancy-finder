---
status: Accepted
owner: "Serhii Lyzun"
reviewers: []
updated_at: "2026-09-19"
feature_size: "L"
ticket: ""
---

# 0001 — Read sources in two phases, hydrating vacancies lazily

- **Status:** Accepted
- **Date:** 2026-09-19
- **Deciders:** Serhii Lyzun, with Claude during the design pass

## Context

A source's results page gives short cards (job number, title, company, usually only a rough age such as "2 weeks ago"), while the full description the fit judge needs sits on a separate detail page, one request per vacancy. The pace limit is at most 1 request per second toward each source, so every detail request costs at least a second and one more chance to be throttled or blocked. Later runs read mostly vacancies the job seeker has already been shown. What the real pages carry is still an open question (`sad.md` §11), so the seam must work whichever way it turns out. This is the shape of the first of the three seams, which every future source has to satisfy.

## Decision drivers

- At most 1 page request per second toward each source, and at most 5 min p95 per search at the default judging limit (spec §6).
- Throttling and blocking are expected, not exceptional (idea brief §6, AC-04, AC-23); fewer requests means fewer chances.
- Judging is limited and goes newest first (AC-21), so the order of candidates is known from the cards alone.
- Whether a vacancy was already shown (source name plus job number) and whether it is a repost (company plus title) can both be decided from a card (repo ADR `docs/adr/0003-keep-seen-memory-in-a-local-sqlite-file.md`).
- Adding a source must stay "add one folder" (repo ADR `docs/adr/0002-organize-code-as-one-folder-per-vacancy-source.md`).

## Considered options

1. **Two-phase, lazy hydrate** — the seam has `list(search)` returning cards and `hydrate(card)` returning the full vacancy; the pipeline drops, de-duplicates and orders on cards, then hydrates and judges one vacancy at a time until the judging limit is filled.
2. **Two-phase, eager hydrate** — the same seam, but every candidate that passed the card-level checks is hydrated before sorting and applying the limit.
3. **Single-phase** — one call `read(search)` returns full vacancies and hides list and detail pages inside the adapter.

## Decision outcome

**Chosen:** Option 1. A repeat run over 100 already-shown vacancies costs a few list requests instead of 100 detail requests (about 100 s at the pace limit, and far less traffic), and the 5-minute budget holds on a first run over hundreds of candidates because only vacancies that will be judged are hydrated.

## Consequences

**Positive**
- Repeat runs are cheap and quiet toward the source; the time budget does not degrade as the seen list grows.
- Seen, repost and date decisions need no detail request.

**Negative**
- Candidates never reached because the limit filled are reported "not judged (limit)" without a salary check, so that count can include vacancies the salary filter would have dropped; the report wording must say so.
- Buckets are assigned in the AC-10 order using what is known at each step: a vacancy whose salary is only on its detail page is checked for salary only if it is hydrated, so an already-seen one is counted as seen, not as dropped for salary.
- Every future source implements two calls.

**Neutral**
- If a real results page already carries the full description, `hydrate` returns its input unchanged and costs nothing.
- Moving to eager hydration later is a small change inside the pipeline; the seam already supports it.

## Links

- Spec: [[../spec.md]] (AC-10, AC-21, AC-23, §6)
- SAD: [[../sad.md]] §4
- Related ADR: [[0002-return-source-failures-as-values-alongside-partial-results]], [[0003-record-one-disposition-per-read-vacancy-and-derive-the-report]]
