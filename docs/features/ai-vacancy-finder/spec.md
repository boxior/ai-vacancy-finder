---
status: Draft
owner: "Serhii Lyzun"
reviewers: []
updated_at: "2026-09-19"
feature_size: "L"
---

# Spec — ai-vacancy-finder

> **Glossary:** [CONTEXT](./CONTEXT.md)
> **Reference module / docs / channels used:** `docs/idea-brief.md` (§1–§8), `docs/roadmap.md` (steps 2–7 and open decisions D1–D5), `docs/architecture-map.md`, `docs/adr/0001`–`0003`, the job seeker's current CV file (read for its format only).

## 1. Context

A job seeker's vacancies are scattered across many sites, and the only way to find the ones worth applying to is to open each site and read. The job seeker wants one command that, for a position, a salary range, a posted-since date and a location, returns the vacancies that pass the filters, judged against their own CV and ordered by fit, with a link to apply on each. The first source is a professional network's public vacancy pages, read without signing in; other sources come later.

The job seeker is in an active search now, so the tool has to be useful within days. If the search ends the tool loses its purpose, which is a reason to keep this first version small: one person, one CV, one source, run on demand.

The committed approach is an on-demand personal tool whose defining feature is an auditable run. It reads the public pages, judges each new vacancy against the CV, lists apply links sorted by fit with a one-line reason, remembers what it has shown so later runs list only new vacancies, and ends every run with a coverage report that says loudly when the source returned nothing or only part of what it should. Existing job-alert and matching tools either judge fit or hide repeats, but none shows what was actually read and judged, so a quiet or partial read looks exactly like "no jobs for you" — the failure this tool exists to prevent.

Foundation constraints carried in from the repo: only public pages are read and the job seeker's own account is never automated; reading them is against the site's terms and may be blocked, which the job seeker accepted knowingly; every source sits behind the same vacancy shape so a second source is added without changing the rest; the memory of what was shown stays on the job seeker's machine.

Decision override: a stated salary that overlaps the salary range even partly is kept — the repo rule says a stated salary outside the range is dropped, and this spec reads "outside" as entirely below or entirely above the range. Rationale: a good vacancy must not be lost to imprecision in a posted figure.

## 2. Goals

- The job seeker gets one list of apply links to new, filter-passing vacancies for a search, ordered by fit with a reason for each.
- Every run is auditable: it states what was read, dropped, judged and left unjudged, and warns loudly when a source returned nothing or only part.
- Each vacancy is shown to the job seeker once: later searches list only new vacancies, and a repost does not come back as new.
- The cost of a run is bounded and visible before the job seeker has to think about it.

## 3. Non-goals

- Applying on the job seeker's behalf or tracking applications (applied, rejected, saved) — a different, larger product; the output is links to open and apply by hand.
- Sources other than the one public site in this spec, including company career pages — chosen as the next step once this works, and their page differences are not yet known.
- Scheduled runs and notifications — the job seeker runs it on demand; a schedule later is the same command started by something else.
- Serving other job seekers or several CVs, and automating the job seeker's signed-in account — a personal tool; the other risks a ban on the account the job seeker needs.

## 4. User stories

### US-01: Run a search

**As a** Job seeker
**I want** to run a search with my position, salary range, posted-since date, location or remote, and CV
**So that** I get the relevant public vacancies without visiting sites by hand

### US-02: See vacancies ordered by fit

**As a** Job seeker
**I want** each new vacancy judged against my CV and listed with its apply link, fit and a one-line reason
**So that** I open the best matches first and know why they were ranked there

### US-03: Trust the coverage report

**As a** Job seeker
**I want** every run to end with a coverage report and a loud warning when a source returned nothing or only part
**So that** a quiet or partial read never looks like "no jobs for you"

### US-04: Filter by salary and date without losing unknowns

**As a** Job seeker
**I want** vacancies outside my salary range or date window dropped, and those with unknown pay or date kept and tagged
**So that** the list is short but no good vacancy disappears only because a site left something out

### US-05: See only new vacancies

**As a** Job seeker
**I want** later searches to list only vacancies I have not been shown, with a way to show everything
**So that** I do not re-read what I already saw

### US-06: Not see reposts twice

**As a** Job seeker
**I want** the same job posted again under a new date or number recognised as already seen
**So that** it does not come back as new

### US-07: Keep the AI cost bounded

**As a** Job seeker
**I want** a limit on how many vacancies one search may judge
**So that** a first search over many vacancies cannot spend more than I intended

## 5. Acceptance criteria

### AC-01 (US-01) — happy path

**Given** the job seeker has a readable CV and gives a position, a salary range, a posted-since date and a location or remote
**When** the job seeker runs the search
**Then** the system reads the source's public vacancy pages, prints apply links to the vacancies that passed the filters, and ends with a coverage report

### AC-02 (US-01) — error

**Given** the job seeker leaves out the position, gives a salary range whose lower end is above its upper end, gives a posted-since date in the future, or gives a judging limit of zero or less
**When** the job seeker runs the search
**Then** the system stops before reading anything and tells the job seeker in plain language which input is invalid and why

### AC-03 (US-01) — error

**Given** the CV file is missing, empty, or in a format the tool does not read (for example a word-processor or PDF document)
**When** the job seeker runs the search
**Then** the system stops before reading any vacancy, names the CV problem, and for an unsupported format says which formats are accepted (plain text `.txt` and Markdown `.md`)

### AC-04 (US-01) — authorization

**Given** the source shows a sign-in page instead of its public vacancy pages
**When** the search runs
**Then** the system does not sign in with any account, reports the source as blocked in the coverage report with a loud warning, lists no vacancies from it, and marks the run as failed (AC-11)

### AC-05 (US-02) — authorization

**Given** the AI access key is not available to the tool
**When** the job seeker runs the search
**Then** the system stops before reading any vacancy and tells the job seeker that the AI access key is missing and how to provide it, instead of printing an unjudged list

### AC-06 (US-02) — happy path

**Given** several new vacancies passed the filters
**When** the search completes
**Then** each is listed with its apply link, its fit (a whole number from 1 to 10) and a one-line reason, ordered from best fit to worst in two groups: untagged vacancies first, then all vacancies carrying at least one tag ("salary not listed", "date approximate", "date not listed", and the tag for pay that cannot be compared once §8 settles it), each group in its own fit order, with every tag of a vacancy shown on its line; fit never removes a vacancy, so every vacancy that passed the filters and was judged is listed, however low its fit

### AC-07 (US-02) — error

**Given** the fit judgment for one vacancy fails or comes back unusable
**When** the search completes
**Then** that vacancy is reported as not judged with the reason, is not shown as a recommendation and is not marked seen, and the remaining vacancies are still judged and listed

### AC-07b (US-02) — error

**Given** the AI service rejects the AI access key, has no allowance left, or cannot be reached
**When** the search judges vacancies
**Then** judging stops at the first such failure, the system prints a loud warning naming the cause, marks the run as failed (AC-11), reports every vacancy not yet judged as not judged with that cause and does not mark them seen; vacancies judged before the failure are still listed

### AC-08 (US-02) — domain invariant

**Given** a vacancy page itself shows a sign that only part of the job description is shown (for example a "show more" marker, a cut-off, or a sign-in gate over the text); the tool never guesses partiality from the length of the text
**When** the vacancy is judged
**Then** its line says the fit is based on a partial description, because a fit is never presented as more certain than the text it rests on

### AC-09 (US-02) — domain invariant

**Given** a vacancy's text tries to instruct the judgment, for example by asking for the top fit
**When** the vacancy is judged
**Then** the fit rests on the match with the CV alone, and the judge, which is told to treat vacancy text as data, reports whether the text contained instructions; when it reports so, the reason line flags the vacancy as containing instructions, because vacancy text is data and never instructions

### AC-10 (US-03) — happy path

**Given** a search finishes, whatever its outcome
**When** the result is printed
**Then** it ends with the coverage report stating, for each source, how many vacancies were read and how each read vacancy was accounted for: dropped for date, dropped for salary, skipped as already seen, skipped as reposts, not judged with the reason, or judged, each counted in exactly one of these, checked in that order, so that they add up to the read count; plus how many were kept without a stated salary and how many without a stated date (both counted within the buckets above), plus how long the run took

### AC-11 (US-03) — domain invariant

**Given** a source was blocked, failed, was throttled, or returned no vacancies at all
**When** the search completes
**Then** the system never prints a bare empty list: it prints a loud warning naming the source and whether it was blocked, failed, throttled or returned nothing, above the coverage report, and marks the run as failed, meaning the run ends with a non-zero exit status and a "RUN FAILED" line in the coverage report; a run that read at least one vacancy and lists none because all were already seen, reposts or dropped by the filters is not failed and ends with the message of AC-16

### AC-12 (US-03) — cross-context

**Given** the source states how many vacancies match the search
**When** this search reads less than half of that number
**Then** the coverage report warns of a partial read and shows how many were read out of how many were expected; this warning alone does not mark the run as failed

### AC-13 (US-04) — happy path

**Given** one vacancy states a salary that overlaps the salary range, even partly, and another states a salary entirely below or entirely above it (a single stated figure counts as a range of zero width, "from X" as X and up, "up to X" as zero to X)
**When** the filters run
**Then** the first is kept and the second is dropped and counted in the coverage report as dropped for salary

### AC-14 (US-04) — domain invariant

**Given** a vacancy states no salary
**When** the filters run
**Then** it is kept, tagged "salary not listed" and placed in the tagged group of AC-06, below untagged vacancies, because missing pay never drops a vacancy

### AC-15 (US-04) — domain invariant

**Given** a vacancy shows only a rough age, such as "two weeks ago", that could fall inside or outside the posted-since window
**When** the filters run
**Then** it is kept, tagged "date approximate" and shown below untagged vacancies, while a vacancy whose age certainly falls before the posted-since date is dropped and counted in the coverage report

### AC-15b (US-04) — domain invariant

**Given** a vacancy shows no posted date or age at all
**When** the filters run
**Then** it is kept, tagged "date not listed", placed in the tagged group of AC-06 and counted in the coverage report as kept without a stated date, because a missing date never drops a vacancy

### AC-16 (US-05) — happy path

**Given** the job seeker ran a search earlier and it listed vacancies
**When** the job seeker runs a search that reads some of those vacancies again
**Then** only vacancies not shown in any earlier search are listed, the coverage report says how many already seen were skipped, and when nothing is new the system says there are no new vacancies together with the read and skipped counts

### AC-17 (US-05) — happy path

**Given** the job seeker asks to show everything
**When** the search runs
**Then** all vacancies that passed the filters are listed, including those shown before, each marked as seen before; vacancies shown before are judged again like any other and count toward the judging limit, new vacancies first and then those shown before newest first, and any left over the limit are reported as not judged because of the limit

### AC-18 (US-05) — cross-context

**Given** a vacancy was dropped for salary or date in an earlier search
**When** the job seeker widens the filter and searches again
**Then** that vacancy appears as new, because only vacancies that were shown count as seen

### AC-19 (US-06) — happy path

**Given** a vacancy from a company with a given title was shown in an earlier search
**When** the same company posts the same title again under a new job number or date (company and title are compared after lowercasing and collapsing repeated spaces, and nothing else is normalised)
**Then** it is not listed as new and the coverage report counts it as a repost; two such vacancies read in the same search are not reposts of each other and both are listed

### AC-20 (US-06) — domain invariant

**Given** reposts were skipped in a search
**When** the job seeker asks to show everything
**Then** those reposts are listed too, because every search states how many were skipped as reposts so that a wrongly skipped opening can always be found

### AC-21 (US-07) — happy path

**Given** more new vacancies pass the filters than the judging limit allows
**When** the search runs
**Then** only that many are judged, newest first (by the best estimate of the posted date from its date or rough age, vacancies with no date last), and the coverage report states how many were not judged because of the limit

### AC-22 (US-07) — domain invariant

**Given** vacancies were not judged because of the limit or a failure
**When** the job seeker searches again
**Then** those vacancies are treated as new and are judged, because a vacancy counts as seen only once it has been shown

### AC-23 (US-03) — error

**Given** the source slows down or refuses requests because it is being asked too often
**When** the search runs
**Then** the system slows its requests down and, once the retry allowance of §6 is used up, reports the source as throttled in the coverage report with a loud warning, marks the run as failed (AC-11), lists only what was read before, and does not retry in a tight loop

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Duration of a search at the default judging limit | ≤ 5 min p95 | run duration printed in the coverage report |
| Judgments per search | ≤ the judging limit (default 30) in 100% of runs | judged count in the coverage report; offline test with a fake judge |
| Request pace toward a source | ≤ 1 page request per second, counted for each source separately | offline test against a fake clock |
| Throttle back-off | ≤ 3 retries per refused request and ≤ 1 min of total waiting per source, then the source is reported as throttled | offline test against a fake clock |
| Coverage report completeness | 100% of runs end with a coverage report, including failed runs | automated test for every failure mode |
| Fit consistency | the same vacancy and CV judged twice differ by ≤ 1 point on a 1–10 scale in ≥ 90% of pairs | the job seeker's spot-check of 20 pairs in the first two weeks |
| Seen-memory correctness | 0 vacancies listed twice across consecutive same-detail searches (without show everything) | offline test over saved pages |

## 6.1 Security / privacy

- **Data classification:** confidential — the CV holds the job seeker's personal contact details and employment history, and its text leaves the machine on every judgment.
- **Personal data touched:** the CV (name, phone, email, messenger handle, employment history) is read from a local file and sent to an external AI service with each judgment; the seen memory stores only vacancy identity and repost fingerprint, never CV text. The job seeker keeps a contact-free copy of the CV outside version control.
- **AuthZ/AuthN impact:** the AI access key comes only from the environment and is never printed or written to a file; no account of the job seeker is ever signed in to a source — a sign-in page means the source is blocked.
- **Abuse cases:**
  - Source shows a sign-in page: reported as blocked, never bypassed.
  - Vacancy text instructs the judge (asks for a top fit): treated as data, flagged in the reason line.
  - Source slows or refuses requests: the tool backs off, reports the source as throttled, and never retries in a tight loop.
  - CV or key leaking into output: the tool never prints CV text or the key, in the list, the coverage report or an error.
- **Security review:** Required, once, before the first real run with a full CV — a short check of exactly what leaves the machine.

## 7. Metrics / KPIs

- **Top-of-list usefulness** — baseline: none yet (new tool), target: in a spot-check, at least 7 of the top 10 links of a run are ones the job seeker judges worth applying to, within the first two weeks of real use.
- **Silent failures** — baseline: none yet, target: 0 runs that end without a coverage report and 0 empty lists printed without a warning, from the first release onward.
- **Cost predictability** — baseline: none yet, target: 100% of runs judge at most the judging limit and print how many judgments were made, from the first release onward.
- **Repeat rate** — baseline: none yet, target: at most 5% of listed vacancies in second and later searches are ones the job seeker has already seen, including reposts, within the first two weeks.

## 8. Open questions

- [ ] What do the source's real public pages show — a plain posted date or only a rough age, how many results per page, how pay appears, which signs mean blocked, does the site state how many results match a search, which exact sign shows that a description is cut off, and does a posted date ever go missing entirely? Default now: assume rough ages only, pay often missing, and no stated match count. — owner: Serhii Lyzun (checked by a prototype on saved real pages), due: before `sdd:design`
- [ ] What is the default judging limit, and which vacancies are judged first when it is hit? Default now: 30, newest first. — owner: Serhii Lyzun, due: before `sdd:tasks`
- [ ] How do location and remote work combine in a search (one place plus a remote-only switch, or several places)? Default now: one place plus a remote-only switch. — owner: Serhii Lyzun, due: before `sdd:design`
- [ ] What happens when a stated salary is in another currency or per hour or month rather than per year? Default now: it cannot be compared, so the vacancy is kept and tagged so it is visible that the pay could not be compared (the tag's exact wording is settled with this question). — owner: Serhii Lyzun, due: before `sdd:design`
