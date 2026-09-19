---
id: T9
title: "Save real public LinkedIn pages as fixtures and record what they show"
layer: "tests"
deps: []
blocks: ["T10", "T11"]
acs: ["AC-04", "AC-08"]
files_hint: ["test/fixtures/linkedin/", "test/fixtures.test.ts"]
owner: "Serhii Lyzun"
estimate: "S"
context_budget: "M"
status: "todo"
---

<!-- To the executing agent: work from what is inlined here. If a slice is insufficient, ambiguous,
or contradicts the code in front of you, open the named file for the full text and follow that.
Do not invent the missing part. Every inline is a snapshot with a provenance signature; the source wins. -->

# T9 — Save real public LinkedIn pages as fixtures and record what they show

## Place in the sequence

- **Blocked by:** — · **Blocks:** T10 — Parse LinkedIn results pages into cards and list them with typed stops, T11 — Parse LinkedIn detail pages, assemble the LinkedIn source and register it · **Wave:** 1, no upstream task, so it starts in the first wave.
- **Lane:** Own lane. Done **by hand by the job seeker**; T10 and T11 cannot start without its files. An executing agent stops here and asks instead of inventing HTML.

## Why (user story)

> **As a** Job seeker
> **I want** to run a search with my position, salary range, posted-since date, location or remote, and CV
> **So that** I get the relevant public vacancies without visiting sites by hand
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task saves real public pages so the parsers are built and tested against what the site actually shows, which is the open question the design tolerates but cannot answer.

## Inlined context

> - [ ] What do the source's real public pages show — a plain posted date or only a rough age, how many results per page, how pay appears, which signs mean blocked, does the site state how many results match a search, which exact sign shows that a description is cut off, and does a posted date ever go missing entirely? Default now: assume rough ages only, pay often missing, and no stated match count. — owner: Serhii Lyzun (checked by a prototype on saved real pages), due: before `sdd:design`
>
> — `spec.md §8, open question 1, verbatim` · full text: [spec.md](../spec.md)

> | Open architectural decision: what LinkedIn's real public pages show (a plain posted date or only a rough age and its granularity, results per page, how pay appears, which signs mean blocked, whether a match count is stated, which sign shows a cut-off description, whether a date ever goes missing) | Open question | Resolve before `sdd:implement`; a prototype over saved real pages fills `test/fixtures/` and the parser needs them. The design assumes the worst case (rough ages only, pay often missing, no stated match count) and tolerates any real outcome (ADR 0001, ADR 0007) | Serhii Lyzun |
>
> — `sad.md §11, first risk row, verbatim` · full text: [sad.md](../sad.md)

> **Offline tests.** Sources are tested against saved real pages in `test/fixtures/`, never the live site. The fit judge is tested against a fake. No test touches the network.
>
> — `CLAUDE.md §Rules, Offline tests, verbatim` · full text: [CLAUDE.md](../../../../CLAUDE.md)

> Reading LinkedIn's public pages is against its terms and may break or be blocked; that trade-off was made knowingly (`docs/idea-brief.md` §6).
>
> — `CLAUDE.md §Gotchas, LinkedIn terms, verbatim` · full text: [CLAUDE.md](../../../../CLAUDE.md)

> - **AuthZ/AuthN impact:** the AI access key comes only from the environment and is never printed or written to a file; no account of the job seeker is ever signed in to a source — a sign-in page means the source is blocked.
>
> — `spec.md §6.1, AuthN impact, verbatim` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full ([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) · [cli.md](../contracts/cli.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-04 — authorization

> **Given** the source shows a sign-in page instead of its public vacancy pages
> **When** the search runs
> **Then** the system does not sign in with any account, reports the source as blocked in the coverage report with a loud warning, lists no vacancies from it, and marks the run as failed (AC-11)
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)

### AC-08 — domain invariant

> **Given** a vacancy page itself shows a sign that only part of the job description is shown (for example a "show more" marker, a cut-off, or a sign-in gate over the text); the tool never guesses partiality from the length of the text
> **When** the vacancy is judged
> **Then** its line says the fit is based on a partial description, because a fit is never presented as more certain than the text it rests on
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Signed out — a private window, no account — save these public pages by hand as HTML into `test/fixtures/linkedin/`: two consecutive results pages of one search (note the URL pattern and the search used); a search that returns nothing; the sign-in wall the site shows instead of public pages, if you can meet it without automating anything (else say 'not observed'); detail pages — one with pay stated, one without, one whose description is cut off (a 'show more' marker or similar), one with a rough age only, one with no date at all, each if such pages exist
- [ ] Write `test/fixtures/linkedin/README.md`: for each saved file, the URL pattern, the date saved and what it demonstrates; then an answer, 'observed' or 'not observed', to each sub-question of spec §8 open question 1 (plain date or rough age and its granularity; results per page; how pay appears; which sign means blocked; whether a match count is stated; which sign shows a cut-off description; whether a date ever goes missing)
- [ ] Remove anything personal or session-bound from the saved files (cookies, tokens, your name or avatar if any leaked despite signing out); no CV text anywhere
- [ ] `test/fixtures.test.ts`: every file the README lists exists and is non-empty, and every fixture file is mentioned in the README
- [ ] Tick spec §8 open question 1 (or list what stays unknown) and update the sad §11 row

## Edge cases

| Case | Behaviour |
|---|---|
| A sub-question cannot be observed (for example no block was seen) | the README says 'not observed'; T10 and T11 keep the design's worst case (rough ages only, pay often missing, no match count) and tolerate it |
| A detail page demands sign-in | that page is the sign-in-wall fixture (AC-04); do not sign in to get past it |
| A saved file holds a personal detail | remove it before committing |
| The live site changes later | fixtures are snapshots; a parser that breaks on new pages is a new capture, not an edit of an old fixture |
| No description with a cut-off sign exists on any page found | README says so; T11 then never sets the partial flag from a guess — only from a sign it has seen |

## Definition of Done

- [ ] `test/fixtures/linkedin/` holds the saved pages and a README that answers every sub-question of spec §8 open question 1
- [ ] `test/fixtures.test.ts` passes
- [ ] no personal data, cookies or CV text in the fixtures
- [ ] `npm run lint` and `npm run build` clean (the per-task gate)
