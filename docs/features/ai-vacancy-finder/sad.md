---
status: Draft
owner: "Serhii Lyzun"
reviewers: []
updated_at: "2026-09-19"
feature_size: "L"
target_surfaces: [cli]
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

**Technical.**
- TypeScript on Node 22, ES modules; `engines` is `>=22` and the development machine runs 22.9.0 (repo ADR `docs/adr/0001-use-typescript-on-node-22.md`).
- `better-sqlite3` pinned to `^12.10.1`: the 13.0.3 prebuilt binary segfaults when opening a database on Node 22.9.0 (`CLAUDE.md` Gotchas). Re-test before moving to 13.
- Libraries the map plans but `package.json` does not list yet: `cheerio` (reading vacancy HTML), `zod` (the vacancy shape and validation of the AI's answer) and `@anthropic-ai/sdk` (used only in `src/matching/`). Everything else is built in: `fetch` for HTTP, `node:util` `parseArgs` for the command line.
- Architecture convention: three seams (vacancy source, fit judge, seen-store) wired once in `src/cli.ts` (`docs/adr/0002-organize-code-as-one-folder-per-vacancy-source.md`); only `src/store/` touches the SQLite file (`docs/adr/0003-keep-seen-memory-in-a-local-sqlite-file.md`).
- Tests run offline with vitest: sources against saved real pages in `test/fixtures/`, the fit judge against a fake; no test touches the network.

**Organisational.**
- One developer, who is also the only user. No effort budget or hard date is quoted; the only time signal is "useful within days" (spec §1), which is why v1 is one person, one CV, one source, run on demand.

**Conventions.**
- `CLAUDE.md` and `docs/architecture-map.md` (Conventions): a failing or empty source raises a typed error the coverage report shows and nothing is swallowed; a vacancy is the source name plus the site's own job number with a company-plus-title fingerprint beside it; migrations are numbered `.up.sql` / `.down.sql` pairs; the AI key comes only from `ANTHROPIC_API_KEY`; relative imports in `src/` and `test/` end in `.js`.

**Regulatory / external.**
- Reading LinkedIn's public pages is against its terms and may be blocked; the job seeker accepted this knowingly (`docs/idea-brief.md` §6).
- The CV (name, phone, email, employment history) is personal data and leaves the machine on every judgment, sent to the AI service; the seen memory never stores CV text (spec §6.1). A security review of exactly what leaves the machine is required once, before the first real run with a full CV.

**Product decisions settled at design (from spec §8).**
- Location: a search takes one place plus a remote-only switch.
- Pay in another currency or period: a stated pay is compared with the salary range only when its currency and its period (a year) match the range's; otherwise the vacancy is kept and tagged "pay not comparable". There is no currency conversion and no month-to-year or hour-to-year guessing.
- Judging limit: default 30, newest first (AC-21). The job seeker can override it for a single search.
- Open, carried to §11: what LinkedIn's public pages really show. The design assumes the worst case (rough ages only, pay often missing, no stated match count) and tolerates any real outcome.

## 3. Context and scope

The system is a command-line program that the job seeker runs on demand. It reads a source's public vacancy pages, reads the job seeker's own CV from a local file, sends the CV and one vacancy's text at a time to the Claude API to judge fit, and remembers what it has shown in a local file so later runs list only new vacancies. The trust boundary is the process itself: everything read from a source is untrusted data (it can hold instructions, a sign-in page or a cut-off description), and the only thing that crosses out is the CV and vacancy text going to the Claude API.

<!-- brownfield: skeleton only — src/cli.ts is a stub, plus the migration runner (src/store/migrate.ts) and the empty baseline migration 0001; no feature code exists yet -->

**External systems (in / out):**

| Actor or system | Type | Interaction |
|---|---|---|
| Job seeker | Person | Runs a search from the terminal with a position, salary range, posted-since date and location, then reads the fit-sorted apply links and the coverage report |
| CV file | Local file (input) | The job seeker's own CV as plain text (`.txt`) or Markdown (`.md`), read at the start of every run; its text goes to the Claude API with each judgment |
| LinkedIn public pages | System (external) | Public vacancy listings and detail pages read without signing in; untrusted content that may change, throttle or block |
| Claude API | System (external) | Receives the CV and one vacancy's text per judgment and returns a fit, a one-line reason and whether the vacancy text contained instructions; needs the key from `ANTHROPIC_API_KEY` |

The seen database (a local SQLite file) belongs to the system itself and appears in §5.

**C4 Context (L1):**

```mermaid
C4Context
    title ai-vacancy-finder - System Context

    Person(seeker, "Job seeker", "Runs a search with a position, salary range, posted-since date and location")
    System(app, "ai-vacancy-finder", "Command-line tool that reads vacancies, judges fit against the CV, and prints fit-sorted apply links plus a coverage report")
    System_Ext(cv, "CV file", "The job seeker's own CV as a local .txt or .md file")
    System_Ext(linkedin, "LinkedIn public pages", "Public vacancy listings and detail pages, read without signing in")
    System_Ext(claude, "Claude API", "Judges each vacancy against the CV")

    Rel(seeker, app, "Runs a search, reads links and the coverage report", "Terminal")
    Rel(app, cv, "Reads", "Local file")
    Rel(app, linkedin, "Reads public pages, at most 1 request per second", "HTTPS")
    Rel(app, claude, "Sends the CV and one vacancy text per judgment", "HTTPS")
```

## 4. Solution strategy

**Target surface.** `cli`: a command-line program the job seeker runs on demand, with no UI and no schedule (scheduled runs are a non-goal; a schedule later is the same command started by something else). Recorded in the frontmatter as `target_surfaces: [cli]`; one surface, so §5 draws one CLI container and the `screens` stage is not needed.

**Top strategic choices (the seeds for ADRs):**

1. **Read sources in two phases, hydrating lazily** — a source lists cards first and the pipeline fetches a full vacancy only when it is about to be judged, so repeat runs stay cheap and quiet toward the source and the 5-minute budget holds. Serves quality goals 2 and 3; constrained by the 1 request per second pace. → `adr/0001-read-sources-in-two-phases-hydrating-lazily.md`
2. **Return source failures as values alongside partial results** — a source reports blocked, throttled, failed or empty as a typed value next to what it did read, so nothing read is lost and no cause is swallowed. Serves quality goal 1. → `adr/0002-return-source-failures-as-values-alongside-partial-results.md`
3. **Record one disposition per read vacancy and derive the report from them** — every read vacancy ends in exactly one bucket, so the coverage report adds up by construction and exists even for a failed run. Serves quality goal 1. → `adr/0003-record-one-disposition-per-read-vacancy-and-derive-the-report.md`
4. **Judge each vacancy in its own schema-checked call** — a failure or an injection attempt in one vacancy touches no other, and service-level failures stop judging loudly. Serves quality goal 2 and fit consistency. → `adr/0004-judge-each-vacancy-in-its-own-schema-checked-call.md`

**How a run flows (derived from the acceptance criteria, not a choice):**

1. **Preflight** — validate the inputs (AC-02), read the CV (AC-03), require the AI key (AC-05) and open the seen database. Any failure stops here, before a single request, with a plain message.
2. **List** — the source returns cards, an optional expected count and an optional stop (ADR 0001, 0002).
3. **Classify on cards** — drop what is certainly older than the posted-since date, skip vacancies already shown (by source name plus job number) and reposts (by company plus title), and check salary when the card states it. Each read vacancy gets its disposition in the AC-10 order (ADR 0003).
4. **Order** — candidates go newest first; with "show everything", new ones first and then those shown before, newest first (AC-17, AC-21).
5. **Hydrate and judge, one vacancy at a time** — fetch the full vacancy, check its salary if the card did not state it, judge it, and stop when the judging limit is filled, the candidates run out, or judging fails at service level (ADR 0004).
6. **Close the accounts** — every vacancy not reached becomes "not judged" with its cause.
7. **Render** — the list (untagged vacancies by fit, then tagged ones by fit), the loud warnings and the coverage report, all derived from the dispositions.
8. **Mark seen** — only after rendering, only vacancies that were shown, in one transaction (AC-22). If the process dies between rendering and marking, a vacancy may come back as new, which is the safe direction.

A vacancy counts as seen only once it has been shown, so the seen memory never hides a vacancy that was dropped, not judged or lost to a failure.

## 5. Building block view

One Node process built from plain modules behind three small seams (vacancy source, fit judge, seen-store); the concrete adapters are wired once in `src/cli.ts` (repo ADR `docs/adr/0002-organize-code-as-one-folder-per-vacancy-source.md`). There is no layering ceremony beyond that. Two additions to the map's module inventory: `src/search/` holds the pipeline of §4 so that `cli.ts` stays a thin composition root and every acceptance criterion can be tested offline by passing fakes in (`adr/0005-run-the-search-pipeline-in-its-own-module-with-adapters-passed-in.md`), and `src/sources/http.ts` is the one polite HTTP client every source uses, with an injected clock so pace and back-off are testable (`adr/0006-share-one-polite-http-client-across-sources-with-an-injected-clock.md`).

**Internal decomposition (file names are indicative; `tasks` fixes them):**

```
src/
├── cli.ts                   composition root: parse args, read the CV, wire adapters, call runSearch, print, exit status
├── domain/                  zod schemas and pure rules, no I/O
│   ├── vacancy.ts             Vacancy (filled progressively), PostedDate (exact | range | unknown), Salary
│   ├── search-input.ts        SearchInput and its validation messages
│   ├── filters.ts             date and salary rules: overlap, comparability, tags
│   ├── disposition.ts         the closed set of dispositions and the run result
│   └── clock.ts               Clock interface (now, sleep)
├── search/
│   └── run-search.ts          the pipeline of §4; depends only on domain and the three seam interfaces
├── sources/
│   ├── source.ts              VacancySource interface (list, hydrate) and the typed stop
│   ├── index.ts               registry of sources
│   ├── http.ts                polite HTTP client: pace, back-off, refusals mapped to stop kinds
│   └── linkedin/              list and detail parsers, sign-in page detection
├── matching/
│   ├── judge.ts               FitJudge interface and its failure classes
│   └── claude-judge.ts        prompt, Anthropic client, schema-checked answer
├── store/
│   ├── seen-store.ts          SeenStore interface
│   ├── sqlite-seen-store.ts   seen memory and repost fingerprint over better-sqlite3
│   └── migrate.ts             migration runner (exists)
└── report/                    pure rendering: list, warnings, coverage report
```

**Shape of the shared vacancy (`adr/0007-model-a-posted-date-as-exact-range-or-unknown.md`).** One `Vacancy` type serves both a card and a hydrated vacancy; its description is empty until it is hydrated. A posted date is an exact date, a range (earliest and latest possible) or unknown. A vacancy is dropped for date only when even its latest possible date is before the posted-since date; a range that straddles that date is kept and tagged "date approximate"; an unknown date is tagged "date not listed"; ordering uses the middle of a range. A salary is a minimum and maximum with a currency and a period.

**C4 Container (L2):**

```mermaid
C4Container
    title ai-vacancy-finder - Containers

    Person(seeker, "Job seeker", "Runs a search and reads the result")
    System_Ext(cv, "CV file", "The job seeker's own CV as a local .txt or .md file")
    System_Ext(linkedin, "LinkedIn public pages", "Public vacancy listings and detail pages")
    System_Ext(claude, "Claude API", "Judges each vacancy against the CV")

    Container_Boundary(app, "ai-vacancy-finder - one Node 22 process") {
        Container(cli, "CLI", "TypeScript", "Parses inputs, reads the CV, wires the adapters, prints the result, sets the exit status")
        Container(search, "Search", "TypeScript", "Runs the pipeline: preflight, list, classify, order, hydrate and judge, close the accounts")
        Container(sources, "Sources", "TypeScript, cheerio", "One folder per site with list and hydrate, plus the shared polite HTTP client; LinkedIn first")
        Container(matching, "Matching", "TypeScript, Anthropic SDK", "Fit judge: prompt, schema-checked answer, failure classes")
        Container(store, "Store", "TypeScript, better-sqlite3", "Seen memory, repost fingerprint and the migration runner")
        Container(report, "Report", "TypeScript", "Renders the fit-sorted list, the warnings and the coverage report from the run result")
        ContainerDb(db, "Seen database", "SQLite file", "Vacancies already shown: identity and repost fingerprint")
    }

    Rel(seeker, cli, "Runs a search, reads the output", "Terminal")
    Rel(cli, cv, "Reads", "Local file")
    Rel(cli, search, "Runs the search with the adapters it wired", "Function call")
    Rel(cli, report, "Renders the run result", "Function call")
    Rel(search, sources, "Lists cards, hydrates vacancies", "Source interface")
    Rel(search, matching, "Judges one vacancy at a time", "Fit judge interface")
    Rel(search, store, "Checks seen and reposts, marks shown", "Seen-store interface")
    Rel(sources, linkedin, "Reads public pages, at most 1 request per second", "HTTPS")
    Rel(matching, claude, "Sends the CV and one vacancy text", "HTTPS")
    Rel(store, db, "Reads and writes", "better-sqlite3")
```

## 6. Runtime view

Participants are the containers of §5 plus the two external systems; messages are semantic, and endpoint-level detail arrives at the `api` stage. The pipeline hands the finished result to a presenter that the CLI supplies (which uses the Report), and marks vacancies seen only after the presenter returns; if printing fails, nothing is marked and the vacancies come back as new. Once a source has stopped, the shared HTTP client refuses further requests to it without waiting, so vacancies not yet hydrated are reported as not judged with the source's cause. A stop during the listing phase therefore judges nothing from that source and the run is still reported as failed with the coverage report. The `sequences` stage covers every other acceptance criterion (an AI service failure, a blocked or empty source, a partial read, "show everything", invalid input).

**Critical flow 1: a successful search**

```mermaid
sequenceDiagram
    actor Seeker as Job seeker
    participant CLI
    participant Search
    participant Sources
    participant LinkedIn
    participant Matching
    participant Claude
    participant Store
    participant Report

    Seeker->>CLI: runs a search with position, salary range, posted-since date and location
    CLI->>CLI: validates the inputs, reads the CV, checks the AI key
    CLI->>Search: runs the search with the wired adapters
    Search->>Store: opens the seen memory
    Search->>Sources: lists cards for the search
    Sources->>LinkedIn: reads result pages, at most 1 request per second
    LinkedIn-->>Sources: cards
    Sources-->>Search: cards and the expected count if the site states one
    Search->>Store: asks which cards are already shown or reposts
    Store-->>Search: seen and repost matches
    Note over Search: drops by date, skips seen and reposts, orders newest first
    loop until the judging limit is filled or the candidates run out
        Search->>Sources: hydrates the next candidate
        Sources->>LinkedIn: reads the detail page
        LinkedIn-->>Sources: full vacancy
        Sources-->>Search: vacancy with its description
        Note over Search: drops by salary when the stated pay is out of range
        Search->>Matching: judges the vacancy against the CV
        Matching->>Claude: sends the CV and the vacancy text
        Claude-->>Matching: fit, reason and instruction flag
        Matching-->>Search: judgment
    end
    Search->>CLI: hands over the run result to print
    CLI->>Report: renders the list, the warnings and the coverage report
    Report-->>CLI: text
    CLI-->>Seeker: prints the result
    Search->>Store: marks the shown vacancies as seen
    Search-->>CLI: final run status
    CLI-->>Seeker: exits with the run status
```

**Critical flow 2: a source starts refusing in the middle of a run**

```mermaid
sequenceDiagram
    actor Seeker as Job seeker
    participant CLI
    participant Search
    participant Sources
    participant LinkedIn
    participant Store
    participant Report

    Note over Search: cards are already listed and ordered, and the first vacancies are already judged
    Search->>Sources: hydrates the next candidate
    Sources->>LinkedIn: reads the detail page
    LinkedIn-->>Sources: refuses and asks to slow down
    loop up to 3 retries, at most 1 minute of total waiting
        Sources->>Sources: waits longer, then retries
        Sources->>LinkedIn: reads the detail page again
        LinkedIn-->>Sources: refuses again
    end
    Sources-->>Search: typed failure throttled, the source is now stopped
    Note over Search: this and every unreached candidate become not judged with cause throttled
    Search->>CLI: hands over the run result to print
    CLI->>Report: renders the list of what was judged, the loud warning and the coverage report
    Report-->>CLI: text ending with the RUN FAILED line
    CLI-->>Seeker: prints the result
    Search->>Store: marks the vacancies that were shown as seen
    Search-->>CLI: final run status failed
    CLI-->>Seeker: exits with a non-zero status
```

## 7. Deployment view

The tool runs as one Node 22 process on the job seeker's own machine, started by hand (`node dist/cli.js` or the `ai-vacancy-finder` bin entry); there is no server, container or schedule. Three things sit outside the code: the CV file, whose path the job seeker passes in; the AI key, read only from `ANTHROPIC_API_KEY`; and the seen database, a single SQLite file that defaults to `data/seen.sqlite` under the project root, resolved from the location of the compiled code and not from the current folder, so running from any folder reads the same memory (the same way the migration runner finds `migrations/`). A `--db <path>` flag overrides it. The file is already covered by the `*.sqlite` pattern in `.gitignore`; if WAL mode is ever turned on, its `-wal` and `-shm` files need patterns too. A missing file means a clean start (created and migrated); a file that exists but cannot be opened or migrated stops the run before any request, because a silent fresh memory would list everything as new.

CI runs on GitHub Actions (Ubuntu, Node 22): `npm ci`, lint, build and test, offline and without a key.

**Monitoring:**
- The coverage report and the exit status are the monitoring: what was read, dropped, judged and not judged, the source's stop cause, and the run duration.
- No metrics, alerts or tracing; a one-person on-demand tool gets a spot-check instead (spec §6 and §7: 20 fit pairs and the top 10 of a run, in the first two weeks).

**Scaling thresholds:**
- Judging is bounded by the judging limit (default 30). If serial judging makes the p95 run exceed 5 minutes, run two or three judgments at once; the seam does not change (`adr/0004-judge-each-vacancy-in-its-own-schema-checked-call.md`).
- The seen database holds one small row per shown vacancy; it stays comfortable in SQLite for years of personal use, so there is no threshold.
- A second source adds its own pace counter (ADR 0006); reading sources in parallel is possible but not needed in v1.

## 8. Crosscutting concepts

| Concept | Convention | Where defined |
|---|---|---|
| Output and exit status | The whole result (list, loud warnings, coverage report) is one document on stdout, so a warning above the report survives redirection to a file. Invalid input, an unreadable CV or a missing key writes a plain message to stderr, exits 2 and reads nothing. A failed run (a source blocked, throttled, failed or empty; an AI service failure; an accounting mismatch; an unusable database) puts a `RUN FAILED` line in the coverage report and exits 1. A partial-read warning alone, or "no new vacancies", exits 0. | here; command contract at the `api` stage |
| Error handling | Expected conditions are typed values: source stops (ADR 0002) and judge failure classes (ADR 0004). `zod` validates every boundary: the search input, the CV, parsed pages and the judge's answer. One catch in the pipeline turns an unexpected exception into a failed run that is still reported. Nothing is swallowed. `CLAUDE.md` says a source "raises" a typed error; ADR 0002 keeps its spirit and needs a one-sentence wording update when implemented. | ADR 0002, ADR 0004, `CLAUDE.md` Rules |
| Secrets and authorisation | The AI key comes only from `ANTHROPIC_API_KEY` and is never printed or written to a file. No account of the job seeker is ever signed in to a source; a sign-in page means "blocked". | spec §6.1, `CLAUDE.md` Rules |
| Privacy of the CV | The CV text is sent as it is to the Claude API with each judgment and is never logged, printed or stored; the seen memory holds only identity and repost fingerprint. Preflight looks for email and phone patterns and, if found, prints one warning that contact details in the CV go to the AI service with every judgment, then continues. It never prints the matched text. This is a reminder, not protection: names, addresses and handles are not detected, so a contact-free copy remains the job seeker's duty. | spec §6.1, here |
| Untrusted vacancy text | Vacancy text is data. It goes into a delimited block of the prompt, the judge is told to treat it as data and reports whether it contained instructions, and nothing outside the judge acts on it. | ADR 0004, AC-09 |
| ID strategy | A vacancy is the source name plus the site's own job number. The repost fingerprint is company plus title, lowercased with repeated spaces collapsed and nothing else normalised. Two vacancies read in the same search are never reposts of each other. | repo ADR 0003, AC-19 |
| Time and pace | An injected `Clock` (now, sleep) drives request pace, back-off, the run duration in the coverage report and "today" for the date rules; tests use a fake clock. | ADR 0006 |
| Salary comparison | An overlap with the salary range, even partial, is kept; a single figure is a range of zero width, "from X" is X and up, "up to X" is 0 to X. A stated pay is compared only when its currency and period match the range's; otherwise it is kept and tagged "pay not comparable". No conversion. | spec §1 decision override, AC-13, §2 |
| Configuration | Flags only, no config file in v1: position, salary range, posted-since date, location or remote-only, CV path, judging limit, model, database path, show everything. Names and defaults are fixed by the `api` stage. | here |
| Testing seams | Sources are tested against saved real pages, the judge against a fake, the store against a real SQLite database (in memory or a temporary file), time against a fake clock, and the whole run through `runSearch`; no test touches the network. | `CLAUDE.md` Rules, ADR 0005 |
| Logging | No logging framework; the report is the output. | — |
| Internationalisation | N/A, English only. | — |
| Observability | The coverage report and the exit status (§7). | §7 |
| Events | N/A, no events, queues or background work. | — |

## 9. Architecture decisions

| # | Title | Status | Section |
|---|---|---|---|
| 0001 | Read sources in two phases, hydrating vacancies lazily | Accepted | §4 |
| 0002 | Return source failures as values alongside partial results | Accepted | §4 |
| 0003 | Record one disposition per read vacancy and derive the report from them | Accepted | §4 |
| 0004 | Judge each vacancy in its own schema-checked call | Accepted | §4 |
| 0005 | Run the search pipeline in its own module with adapters passed in | Accepted | §5 |
| 0006 | Share one polite HTTP client across sources, with an injected clock | Accepted | §5 |
| 0007 | Model a posted date as exact, a range, or unknown | Accepted | §5 |

ADR files live under `docs/features/ai-vacancy-finder/adr/NNNN-<title>.md`. The repo-level decisions this feature builds on are `docs/adr/0001-use-typescript-on-node-22.md`, `docs/adr/0002-organize-code-as-one-folder-per-vacancy-source.md` and `docs/adr/0003-keep-seen-memory-in-a-local-sqlite-file.md`.

## 10. Quality requirements

Each top-3 goal from §1 expanded into a scenario, plus two further scenarios from spec §6 and §6.1. Every number is copied from spec §6. "Run" below means a search that passed preflight: a search rejected before reading (AC-02, AC-03, AC-05) reads nothing and prints only its message.

**QG-1. Auditable runs**
- **When:** a search ends, whatever the outcome: success, a source blocked, throttled, failed or empty, an AI service failure, or an unexpected exception.
- **Then:** it ends with the coverage report, in which the buckets add up to the read count. A loud warning above it names any source that stopped, and the run shows `RUN FAILED` with a non-zero exit status. A bare empty list is never printed. 100% of runs end with a coverage report, including failed runs.
- **How verify:** automated tests through `runSearch` with a fake source and a fake judge for every failure mode, asserting the report, the sum, the `RUN FAILED` line and the exit status; a test that every source stop kind reaches the report (ADR 0002, ADR 0003).

**QG-2. Bounded cost and polite pace**
- **When:** a search runs at the default judging limit against a source with more candidates than the limit, or against a source that refuses requests.
- **Then:** at most the judging limit (default 30) judgments are made in 100% of runs. Requests are at most 1 page request per second, counted for each source separately. A refused request is retried at most 3 times with at most 1 min of total waiting per source, then the source is reported as throttled. A search takes at most 5 min p95 at the default judging limit.
- **How verify:** an offline test with a fake judge that counts its calls; offline tests against a fake clock for the pace and for the back-off (ADR 0006); the run duration printed in the coverage report, watched over real use.

**QG-3. Seen-memory correctness**
- **When:** consecutive searches with the same details run without "show everything", including reposts of vacancies already shown.
- **Then:** 0 vacancies are listed twice across consecutive same-detail searches. A repost is counted as a repost and not listed as new, and only vacancies that were shown count as seen.
- **How verify:** an offline test that runs twice through `runSearch` over saved pages with a real SQLite store, plus a case with the same company and title under a new job number.

**QG-4. Fit consistency**
- **When:** the same vacancy and CV are judged twice.
- **Then:** the two fits differ by at most 1 point on a 1–10 scale in at least 90% of pairs.
- **How verify:** the job seeker's spot-check of 20 pairs in the first two weeks (spec §6); the design lever is the rubric with anchor descriptions and one call per vacancy (ADR 0004).

**QG-5. Confidentiality of the CV and the key**
- **When:** any run, including every failure mode.
- **Then:** neither the AI key nor CV text appears in the list, the coverage report, an error message or the seen database; the only outward flow of CV text is to the Claude API with each judgment.
- **How verify:** an automated test with a sentinel CV text and a sentinel key across success and every failure mode, asserting that neither appears in stdout, stderr or the database; the one-time security review before the first real run with a full CV (spec §6.1).

## 11. Risks and technical debt

| Risk / debt | Severity | Mitigation | Owner |
|---|---|---|---|
| Open architectural decision: what LinkedIn's real public pages show (a plain posted date or only a rough age and its granularity, results per page, how pay appears, which signs mean blocked, whether a match count is stated, which sign shows a cut-off description, whether a date ever goes missing) | Open question | Resolve before `sdd:implement`; a prototype over saved real pages fills `test/fixtures/` and the parser needs them. The design assumes the worst case (rough ages only, pay often missing, no stated match count) and tolerates any real outcome (ADR 0001, ADR 0007) | Serhii Lyzun |
| LinkedIn changes its pages or blocks the traffic; reading them is against its terms (accepted knowingly, `docs/idea-brief.md` §6) | High | Blocked, throttled, failed and empty are typed stops that are always reported and mark the run failed (ADR 0002, ADR 0003); pace at most 1 request per second (ADR 0006); no sign-in, ever; fixtures make the parser's breakage visible in tests | Serhii Lyzun |
| `CV_Serhii_Lyzun.docx`, the real CV with contact details, is committed locally in `2d63f34` and a GitHub remote is configured; at the time of this design it is not on `origin/main`. The tool also cannot read it (only `.txt` and `.md`, AC-03) | High | Do not push `main` until it is resolved; remove the `.docx` from the unpushed history and keep it out of the repository; create a contact-free `.md` copy in a gitignored place for the tool. Design does not touch git history | Serhii Lyzun |
| Fit judgments are inconsistent or untrustworthy (a vague CV, a drifting model) | Medium | A rubric with anchor descriptions and one call per vacancy (ADR 0004); spot-check 20 fit pairs and the top 10 of a run in the first two weeks (spec §6, §7) | Serhii Lyzun |
| Serial judging may exceed 5 min p95 if a judgment takes more than about 6 s (an estimate in ADR 0004, not a measurement) | Medium | The run duration is printed in the coverage report; if it exceeds the budget, run two or three judgments at once (the seam does not change) or change the default model | Serhii Lyzun |
| A seen memory that is lost, corrupt or pointed at the wrong file makes every vacancy look new again | Medium | The default path resolves from the compiled code, not the current folder; a database that cannot be opened stops the run before any request; a `--db` flag overrides (§7) | Serhii Lyzun |
| A vacancy's text tries to instruct the judge (spec §6.1) | Medium | Vacancy text sits in a delimited data block, the judge flags instructions, and the judge has no tools and returns only a fit, a reason and a flag, so the worst case is a skewed score (ADR 0004, AC-09) | Serhii Lyzun |
| The one-time security review of exactly what leaves the machine is not done yet (spec §6.1) | Medium | Do it before the first real run with a full CV, before `sdd:ship`; preflight also warns when the CV looks like it holds contact details (§8) | Serhii Lyzun |
| `better-sqlite3` is a native library pinned to the 12.x line: 13.0.3's prebuilt binary segfaults on Node 22.9.0; a machine with no matching prebuilt binary needs a build toolchain | Low | Keep `^12.10.1`; re-test before moving to 13 (`CLAUDE.md` Gotchas) | Serhii Lyzun |
| Lazy hydration makes "not judged (limit)" imprecise (it can include vacancies the salary filter would have dropped), and a shown vacancy whose salary is only on its detail page counts as seen, not as dropped for salary | Low | The report wording says so; recorded in ADR 0001 | Serhii Lyzun |
| Documents drift from this design: `CLAUDE.md` still says a source "raises" a typed error (ADR 0002), `docs/architecture-map.md` lacks `src/search/` and `src/sources/http.ts`, and spec §6 does not say whether "100% of runs end with a coverage report" includes searches rejected before reading (§10 reads it as runs that passed preflight) | Low | Update the `CLAUDE.md` sentence when implementing; refresh the map with the next `survey`; confirm the reading of §6 at the next spec touch | Serhii Lyzun |

**Accepted debt (acceptable in v1, plan to fix later):**
- Judgments run one after another; concurrency is a later lever if the budget is threatened.
- Configuration is flags only, with no config file.
- The CV contact check is a reminder, not protection; a contact-free copy stays the job seeker's duty.
- Only one source exists; a second source (company career pages) may need to adjust the shared vacancy shape, as repo ADR 0002 already notes.

## 12. Glossary

<!-- pending -->
