---
status: Draft
owner: "Serhii Lyzun"
reviewers: ["Serhii Lyzun"]
updated_at: "2026-09-19"
feature_size: "L"
---

# Test plan — ai-vacancy-finder

The command reads a source's public vacancy pages, drops what fails the salary and date filters, skips what was already shown or is a repost, judges the rest against the CV under a limit, prints apply links sorted by fit, and ends every run with a coverage report. This plan ties every acceptance criterion in `spec.md` §5 (AC-01 … AC-23, including AC-07b and AC-15b) to named tests. The `implement` stage writes the red tests against the Level column and does not re-decide it.

Sources: `spec.md` §5–§6, `sad.md` §6 flows and §10 quality scenarios, `contracts/cli.md`, `data-model.md`, `tasks.json`.

Ground rules (from `CLAUDE.md`): no test touches the network; sources are tested against saved real pages; the fit judge is tested against a fake; the clock is injected, so time-dependent tests run in fake time.

## Levels

| Level | Scope | Strategy (generic — no tool names) |
|---|---|---|
| unit | Pure logic: input validation, CV checks, salary and date filters, repost fingerprint, disposition accounting, list and report rendering, page parsing, the fit judge's request and answer handling, the polite HTTP client's pace and back-off. | In memory. Page parsing reads saved real pages. The fit judge is exercised against a fake AI service. The clock is a fake that moves only when told. |
| integration | The search pipeline (`runSearch`) and the seen-store against a real SQLite database. | Fake source and fake judge feed the pipeline. The store is always the real one on the real schema (fresh in-memory database per test). |
| contract | The two agreed boundaries: the CLI's output and exit-status shape (`contracts/cli.md` §5–§6), and the fit judge's answer shape (ADR 0004). | Assert against the written shape (layout, codes, status values, answer schema) rather than against hand-rolled stand-ins. A change to either shape must fail a test. |
| e2e | The wired command (`src/cli.ts`) from arguments to printed document and exit status. | Real entry point, saved real pages served by a fake source transport, fake judge, real store, fake clock, output captured from both streams. |
| load | Numeric NFRs of `spec.md` §6, checked offline. | Scenarios run in-process with a fake clock and a fake source holding hundreds of cards, so no real waiting and no network. If a dedicated load tool is ever wanted: the one already in the repo, or e.g. k6 / Locust. |

<!-- N/A: component, visual-regression and e2e-through-UI levels — sad.md target_surfaces is [cli], no UI surface -->

## AC coverage

Every AC maps to at least one row. Error, authorization and domain-invariant ACs have their own rows, separate from the happy path. Outcomes are in plain words; exact printed texts and codes live in `contracts/cli.md` and are asserted by the contract rows.

| AC (spec.md §5) | Test name (intent-based) | Level | Expected outcome | Task |
|---|---|---|---|---|
| AC-01 happy path | search over saved pages lists the vacancies that passed the filters and ends with a coverage report | integration | links for filter-passing vacancies, coverage report last | T13 |
| AC-01 | wired command run with valid input over saved pages prints links and a coverage report | e2e | document on stdout, run reported as successful | T19, T20 |
| AC-02 invalid input | missing position is rejected naming the position | unit | one problem line naming `--position` | T18 |
| AC-02 | salary range with its lower end above its upper end is rejected | unit | problem line names both figures | T18 |
| AC-02 | posted-since date in the future is rejected | unit | problem line says the date is in the future | T18 |
| AC-02 | judging limit of zero or less is rejected | unit | problem line says the limit must be 1 or more | T18 |
| AC-02 | several invalid inputs are reported together in one message | unit | one line per problem, none hidden | T18 |
| AC-02 | invalid input stops the run before any source request, any judgment and any seen-marking | e2e | usage-error status, message on the error stream only, spies show zero source calls, zero judge calls, zero rows written | T19, T20 |
| AC-03 CV problem | missing CV path is rejected | unit | message names the missing CV | T18 |
| AC-03 | CV file that does not exist or cannot be read is rejected | unit | message names the path and the reason | T18 |
| AC-03 | CV in an unsupported format (word-processor or PDF) is rejected with the accepted formats | unit | message names the format and says plain text and Markdown are accepted | T18 |
| AC-03 | empty or whitespace-only CV is rejected | unit | message says the CV file is empty | T18 |
| AC-03 | CV problem stops the run before any vacancy is read | e2e | usage-error status, zero source calls | T19, T20 |
| AC-04 authorization | sign-in page instead of results is recognised as blocked | unit | list parser returns the blocked stop for the saved sign-in page | T10 |
| AC-04 | blocked source yields no vacancies, a loud warning naming "blocked", and a failed run | integration | warning above the report, report present, run marked failed | T14 |
| AC-04 | run against a sign-in page never signs in and lists nothing | e2e | no credential or login request sent by the transport, no vacancies listed, failed status | T19, T20 |
| AC-05 authorization | missing AI access key is rejected with how to provide it | unit | message says the key is missing and how to set it | T18 |
| AC-05 | missing key stops the run before any source request and prints no unjudged list | e2e | usage-error status, zero source calls, zero judge calls, nothing on stdout | T19, T20 |
| AC-06 fit order | list puts untagged vacancies first and tagged ones after, each group best fit first | unit | two groups in the stated order | T16 |
| AC-06 | every tag of a vacancy is shown on its line | unit | all tags present on the entry | T16 |
| AC-06 | a low-fit vacancy that passed the filters is still listed | unit | vacancy with fit 1 appears in its group | T16 |
| AC-06 | printed document shows one entry per judged vacancy with link, fit and reason | e2e | entries match the fake judge's answers in order | T19, T20 |
| AC-07 one judgment fails | unusable or schema-failing judge answer becomes "not judged" with its reason | unit | disposition not judged, reason unusable answer | T8 |
| AC-07 | one unusable judgment leaves the other vacancies judged and listed, and that vacancy unlisted and not marked seen | integration | others listed, failed one absent from list and from the store, run not failed | T15 |
| AC-07b service-level failure | judge classifies rejected key, exhausted allowance and unreachable service as distinct causes | unit | three distinct typed failures | T8 |
| AC-07b | judging stops at the first service-level failure; earlier vacancies stay listed; the rest are "not judged" with that cause and not marked seen | integration | earlier results listed, remainder counted with the cause, run failed, store holds only listed ones | T15 |
| AC-07b | service failure prints a loud warning naming the cause and ends the run as failed | e2e | warning above report, failed status | T19, T20 |
| AC-08 partial description | a cut-off or "show more" marker or sign-in gate over the text on a saved detail page marks the description partial | unit | partial flag set | T11 |
| AC-08 | a short or long description without any marker is not marked partial | unit | partial flag not set (length is never used) | T11 |
| AC-08 | the entry of a partial-description vacancy says its fit rests on a partial description | unit | mark shown on the entry | T16 |
| AC-09 instructions in vacancy text | judge request presents vacancy text as data and the answer carries a "text contained instructions" flag | unit | request and schema as agreed in ADR 0004 | T8 |
| AC-09 | when the judge reports instructions, the reason line flags the vacancy | unit | flag text present on the reason line | T16 |
| AC-10 accounting | each read vacancy is counted in exactly one bucket, in the stated order | unit | date, salary, seen, repost, not judged, judged precedence respected | T3 |
| AC-10 | a mismatch between the buckets and the read count is detected | unit | accounting check fails, run marked failed | T3 |
| AC-10 | a run mixing every disposition ends with buckets that add up to the read count | integration | sum equals read count | T13 |
| AC-10 | the printed coverage report shows the buckets, kept-without-salary, kept-without-date and duration | e2e | all lines present, buckets add up | T19, T20 |
| AC-11 never a bare empty list | each source stop kind (blocked, throttled, failed, empty) gives a loud warning naming the kind and a failed run | integration | four cases, each with warning, report and failed marker | T14 |
| AC-11 | source stop through the wired command never prints a bare empty list | e2e | warning and `RUN FAILED` line present, failed status | T19, T20 |
| AC-11 | a run that read vacancies and lists none because all were seen, reposts or filtered is not failed | integration | "no new vacancies" message with counts, run not failed | T13 |
| AC-12 partial read | list parser reads the site's stated match count when present | unit | expected count exposed, absent when not stated | T10 |
| AC-12 | reading less than half of the expected count warns of a partial read and does not fail the run | integration | warning with read-of-expected numbers, run not failed | T14 |
| AC-13 salary overlap | partly overlapping stated pay is kept; pay entirely below or above is dropped | unit | kept, dropped below, dropped above | T2 |
| AC-13 | single figure, "from X" and "up to X" follow the stated reading | unit | single figure as zero-width range, from-X as X and up, up-to-X as zero to X | T2 |
| AC-13 | vacancies dropped for salary are counted as dropped for salary | integration | bucket count matches | T13 |
| AC-14 no salary | vacancy without stated pay is kept and tagged "salary not listed" | unit | kept with tag | T2 |
| AC-14 | tagged vacancy is listed below untagged ones | integration | order in the printed list | T13 |
| AC-15 rough date | rough age that could fall inside or outside the window is kept and tagged "date approximate" | unit | kept with tag | T2 |
| AC-15 | age that certainly falls before the posted-since date is dropped and counted | unit | dropped for date | T2 |
| AC-15b no date | vacancy with no date or age is kept, tagged "date not listed" and counted as kept without a stated date | unit | kept with tag, counted | T2 |
| AC-16 only new | a second identical search lists only vacancies not shown before and reports how many already seen were skipped | integration | new ones only, skipped count | T12, T13 |
| AC-16 | a second search with nothing new says so with the read and skipped counts | integration | "no new vacancies" message, counts, run not failed | T13 |
| AC-17 show everything | show-everything lists earlier-shown vacancies marked "seen before" and judges them again | integration | marked entries, judge called for them | T13 |
| AC-17 | show-everything counts re-judged vacancies toward the limit, new first then shown-before newest first, overflow reported as not judged because of the limit | integration | order and overflow count | T12, T13 |
| AC-18 dropped is not seen | a vacancy dropped for salary or date earlier appears as new after the filter is widened | integration | listed as new | T12, T13 |
| AC-19 repost | company and title compare after lowercasing and collapsing repeated spaces, nothing else | unit | equal for case and spacing differences, different for any other difference | T1 |
| AC-19 | the same company and title under a new job number is not listed as new and is counted as a repost | integration | skipped, repost bucket incremented | T12, T13 |
| AC-19 | two vacancies with the same company and title read in the same search are both listed | integration | both listed, neither a repost | T12, T13 |
| AC-20 reposts recoverable | show-everything lists the reposts that were skipped before | integration | reposts listed with the repost mark | T13 |
| AC-21 limit | more new candidates than the limit → only that many judged, newest first, no-date last, remainder counted as not judged because of the limit | integration | judge call count equals the limit, order as stated, remainder count | T13 |
| AC-22 not judged counts as new | vacancies not judged because of the limit or a failure are judged in the next search | integration | absent from the store after run one, judged in run two | T13, T15 |
| AC-23 throttled | polite client backs off on refusals and gives up after its retry allowance | unit | fake-time waits grow, gives up as throttled, no tight loop | T7 |
| AC-23 | throttled source lists only what was read before, warns loudly, fails the run | integration | earlier vacancies listed, warning, failed run | T14 |
| AC-23 | throttled run through the wired command ends with the warning and `RUN FAILED` | e2e | warning, report, failed status | T19, T20 |

### Contract rows (boundaries agreed in `contracts/cli.md` and ADR 0004)

| Contract | Test name (intent-based) | Level | Expected outcome | Task |
|---|---|---|---|---|
| CLI usage errors (AC-02, AC-03, AC-05) | every usage-error code of `cli.md` §6.1 is produced by the input that the contract names for it | contract | one table-driven case per code, message template and code match | T18, T19 |
| CLI output layout (AC-06, AC-10, AC-11) | document has list, then warnings, then coverage report, with the entry, group heading, tag, mark and no-list message shapes of `cli.md` §5.2–§5.3 | contract | layout matches the contract | T16, T17 |
| CLI exit statuses (AC-04, AC-11, AC-12) | success, failed run and usage error return the three distinct statuses, and a partial-read warning alone stays successful | contract | statuses match `cli.md` §4 | T19 |
| CLI streams | usage errors go to the error stream only; the document goes to stdout only | contract | nothing crosses streams | T19 |
| Fit judge answer (AC-07, AC-09) | answer with fit outside 1–10 or not whole, a missing reason, a multi-line reason or a missing instructions flag is rejected as unusable; a valid answer is accepted | contract | schema check as in ADR 0004 | T8 |
| Vacancy source seam (AC-04, AC-08, AC-12, AC-15) | the LinkedIn adapter over saved pages returns the shared vacancy shape or a typed stop, never anything else | contract | shape and stop kinds match `src/domain/` | T10, T11 |

### Supporting rows (the seen-memory the ACs rest on)

| Supports | Test name (intent-based) | Level | Expected outcome | Task |
|---|---|---|---|---|
| AC-16, AC-19, AC-22 | the staged migration applies to an empty database and rolls back cleanly | integration | table and index present after up, gone after down | T5 |
| AC-16 | the same source and job number cannot be stored twice, and marking again changes nothing including the first-shown time | integration | one row, original timestamp kept | T6 |
| AC-19 | an empty source, job number or fingerprint is refused by the schema | integration | write rejected | T6 |
| AC-16 | the "already seen" lookup answers for a batch of source and job-number pairs | integration | seen and unseen split correctly | T6 |
| AC-19 | the repost lookup answers for a batch of fingerprints against the memory as it was before the search | integration | reposts found; same-search duplicates not found | T6, T12 |

## Edge cases / error paths

Each row is its own test (table-driven where the same rule repeats). Outcomes are named in plain words.

**Command line and input (T18, contract rows)**
- no arguments at all → the missing position is reported and `--help` is pointed to; help is not printed as a success.
- unknown flag, flag without its value, or a positional argument → rejected as an unknown option, nothing read.
- salary bound given without a currency → rejected. *(Interim: `cli.md` OQ-1 is open; the test follows the current contract and is marked as interim.)*
- currency given without any salary bound → rejected as having no effect.
- currency that is not three letters → rejected; lower-case currency is accepted and stored upper-case.
- only one salary bound → accepted as an open-ended range.
- salary bound that is negative or not a whole number → rejected.
- posted-since that is not a real calendar date (for example 30 February) → rejected; today's date → accepted; tomorrow → rejected.
- judging limit that is one, zero, negative, fractional or not a number → only one is accepted.
- blank location or blank model → rejected.
- CV path is a folder → reported as unreadable; upper-case extension (`.MD`) → accepted.
- key set to an empty string → treated as missing.
- CV that looks like it holds an email address or phone number → one notice on the error stream, run continues, the matched text is never printed.

**Seen-memory file (T6, T15)**
- database file does not exist → created and migrated, run continues; default folder missing → created.
- database file exists but is not a usable database → run fails loudly as an unusable memory, nothing read, empty accounting, failed status.
- `--db` path whose folder does not exist → same unusable-memory failure, never a silent fresh memory.
- the result cannot be printed → plain message on the error stream, nothing marked seen, failed status.
- seen-marking happens once, in one transaction, only after the result was printed; a failure part-way leaves no partial marks.

**Source pages (T10, T11, saved pages)**
- results page with zero vacancies → source reported as empty, run failed (not "no new vacancies").
- sign-in page as the results page → blocked; sign-in page appears for a detail page mid-run → vacancies already read stay listed, the rest are "not judged" with the blocked cause.
- sign-in gate over the description text (results are public) → partial-description mark, not a blocked source.
- results with a stated match count and read count exactly half of it → no partial warning (only strictly less than half warns); no stated count → no partial warning.
- unreadable page or unexpected error while reading → source failed, reported by name.
- rough ages ("2 weeks ago") and missing dates → tagged, never dropped unless certainly before the window.

**Filters (T2)**
- single stated figure exactly equal to the range's lower or upper end → kept.
- "from X" where X is above the range's upper end → dropped; "up to X" where X is below the range's lower end → dropped.
- stated pay in another currency or per hour or month → kept and tagged "pay not comparable". *(Interim: `cli.md` OQ-1; the tag wording is the contract's proposal.)*
- posted exactly on the posted-since date → kept; one day earlier → dropped.
- a vacancy that fails both filters is counted once, as dropped for date (the AC-10 order).

**Repost and seen rules (T1, T12)**
- same company and title differing only in case or repeated spaces → repost.
- differing in punctuation, accents or a word → not a repost (nothing else is normalised).
- same job number as a shown vacancy but a different title → seen (identity is source plus job number).
- a vacancy dropped in an earlier search and one not judged because of a limit or a failure have no stored row and come back as new.

**Judging (T8, T13, T15)**
- answer that is not valid JSON, has fit 0, 11, 2.5 or a text, no reason, a reason of two lines → unusable answer, only that vacancy is not judged, run not failed.
- key rejected, allowance exhausted, service unreachable after the client's own retries, service rejects the model name → judging stops, warning names the cause, run failed. *(The model-name case follows `cli.md` OQ-2 and is marked interim.)*
- exactly as many candidates as the limit → none over the limit; one more → one not judged because of the limit.
- every candidate ends up not judged and the run did not fail → the "no vacancies listed, could not be judged" message with a report. *(Interim: `cli.md` OQ-3.)*
- an unexpected exception anywhere in the pipeline → reported as an unexpected error with a message that holds no CV text and no key, run failed, report still printed.
- the buckets fail to add up → a warning names both numbers, run failed.

**Confidentiality and network (T20)**
- a sentinel line planted in the CV and a sentinel key never appear on stdout or the error stream in any success or failure run.
- any attempt to reach a real network address fails the test run (a guard installed for the whole suite).

## Test data

- **Seed strategy.**
  - Saved real public pages under `test/fixtures/` (captured by T9): a results page, a detail page with full text, a detail page with a cut-off marker, a sign-in page, an empty results page, pages showing a rough age, no date, a stated salary and no salary. Company names in test builders are fictional; no CV text or personal data appears anywhere.
  - If a page state cannot be captured from the real site, the fixture is a minimal single-element edit of a real saved page and is marked as edited in the fixtures record — never a page written from scratch.
  - Builders: `aVacancy(overrides)` for the shared vacancy shape, `aShownVacancy(overrides)` for a `shown_vacancy` row (per `data-model.md`), a fake clock, a fake source, a fake judge that records its calls and can be told to fail in each way, a spy over the output streams, and a fixed CV text with a planted sentinel.
  - `openMemoryStore()` opens an in-memory database and runs the real migrations (`data-model.md`, Test fixtures).
- **Integration dependency.** A real SQLite database on the real schema. It is embedded, so the "throwaway container" of the generic template is replaced by a database created in memory in milliseconds. No test whose subject is seen-memory behaviour, filtering order, or the pipeline's accounting uses a fake or mocked store.
- **Cleanup boundary: per-test.** Every integration, contract and e2e test opens its own fresh in-memory database and fake clock, so runs are independent and can run in parallel. Tests that check the database file itself (`--db` behaviour, an unusable file, a missing folder) use a temporary file inside a temporary folder that is removed after the test.

## NFR validation (load)

Load here means the numeric NFRs of `spec.md` §6 checked offline: a fake clock (time moves at once) and a fake source holding hundreds of cards. Nothing is run against the real site or the real AI service.

- **Judgments per search (≤ the limit, 100% of runs)** → scenario: one run each at limit 30 (default), limit 1 and limit 500 over a fake source that returns 500 cards that all pass the filters, plus one run with 10 cards; assert the fake judge's call count ≤ the limit in 4 of 4 runs, the printed "judgments made" equals the counted calls, and the remainder is reported as not judged because of the limit.
- **Request pace (≤ 1 page request per second, per source)** → scenario: 100 page requests to one fake source through the shared HTTP client in fake time, and a second scenario with two fake sources interleaved; assert the gap between consecutive requests to the same source is ≥ 1 s, 100 requests take ≥ 99 s of fake time, and one busy source does not delay the other.
- **Throttle back-off (≤ 3 retries per refused request, ≤ 1 min total wait per source)** → scenario: a fake source that refuses every request; assert ≤ 3 retries per refused request, total waiting ≤ 60 s of fake time, a wait > 0 s before every retry (no tight loop), then the source is reported as throttled, the run is failed, and the report is present.
- **Coverage report completeness (100% of runs, including failed runs)** → scenario: one run per failure mode (source blocked, throttled, failed, empty; key rejected; allowance exhausted; service unreachable; every answer unusable; unexpected error; unusable memory), each at 0 and at 500 cards; assert 100% of runs end with a coverage report whose buckets add up. The one exception is a result that cannot be printed, which must instead leave a plain message on the error stream and nothing marked seen.
- **Seen-memory correctness (0 vacancies listed twice across consecutive same-detail searches)** → scenario: 5 consecutive identical searches without show-everything over 100 cards (10 of them reposts under new job numbers) against the real store; assert the count of vacancies listed more than once across runs is 0.
- **Duration budget (≤ 5 min at the default limit)** → scenario: default limit 30, judge latency 5 s in fake time, the ≥ 1 s pace, 5 results pages and 30 detail pages; assert the printed duration (taken from the injected clock) ≤ 300 s. This is a modelled budget that checks the pace arithmetic; the real p95 is read from the printed duration in real use.

Not covered by automated tests, by design (they need the live site or the live model): fit consistency (same vacancy and CV differ by ≤ 1 point in ≥ 90% of pairs — the job seeker's spot-check of 20 pairs, `spec.md` §6); whether the real model resists instructions in vacancy text (the offline tests check only that the text is sent as data and that the flag is shown — the check of what leaves the machine is the security review of `spec.md` §6.1, required once before the first real run with a full CV); the real p95 duration; and drift of the real site's pages from the saved ones.

## CI placement

- On every PR: all automated suites — unit, contract, integration, e2e and the offline load scenarios. They are all offline, use in-memory databases and a fake clock, and are expected to finish in seconds, so nothing needs to wait for a schedule.
- Before the first real run and during the first two weeks of use (manual, not CI): the security review of what leaves the machine, the fit-consistency spot-check, the top-of-list usefulness spot-check, and a refresh of the saved pages if the site's layout changes.
