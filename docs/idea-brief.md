---
status: Draft
owner: "Serhii Lyzun"
updated_at: "2026-09-19"
depth: "medium"
---

# Idea brief — ai-vacancy-finder

## 1. Raw idea

Looking at internet(linkeding for now) find the job vacancies that match my CV. This searcher shoudl include inputs like: job positions, salary range, vacancy posted from date(to filter out the latest posts), and potentially more filters later. The output sholud be links to vancancies where can I apply

## 2. Problem

Job vacancies are scattered across many sites, and the owner wants one place where a search returns only the vacancies worth applying to, judged against their own CV. Asked what hurts most, the owner picked "multi-site in the future" over noise, daily repetition or weak filters, so LinkedIn is the first source and not the whole point. Filtering by position, salary range and posted-since date alone is not the goal: a vacancy has to fit the CV.

## 3. Users

One user: the owner, running their own active job search with their own CV. No other people, no accounts, no sharing.

## 4. Why now

The owner is in an active search now (or about to be), so the tool has to be useful within days. There is no other trigger. If the search ends, the tool loses its purpose, which is a reason to keep the first version small.

## 5. Out of scope

- Serving other job seekers or handling several CVs: chosen as a personal tool; a product for others would need a different data source and has a much larger legal exposure.
- Tracking applications (applied / rejected / saved): a different, larger product; worth considering only after the search part proves useful.
- Automating the owner's logged-in LinkedIn account: rejected because it risks a ban on the account the owner needs for the search.
- Sources other than LinkedIn in the first version: multi-site is the direction, not the first deliverable.
- Applying on the owner's behalf: the output is links to open and apply by hand.

## 6. Risks

- Assumes reading LinkedIn's public pages (no login) keeps working; false if LinkedIn changes its pages or blocks the traffic, which is likely to happen at some point. It is also against LinkedIn's terms; the owner chose this knowingly.
- Assumes a vacancy's stated pay is usually available to filter on; false when most postings state no salary, so the salary filter will feel weaker than it looks. Decision taken: vacancies without a salary are kept, tagged "salary not listed" and shown below the confirmed ones; vacancies with a stated salary outside the range are dropped.
- Assumes an AI reading the CV and each vacancy gives a fit score the owner can trust; false if the CV text is vague or the judgments are inconsistent, so the first weeks need spot-checking.
- A quiet empty result is the worst failure: the owner believes there are no new jobs when the tool actually read nothing (blocked or broken).
- Assumes "new since last time" is well defined; false when the same job is reposted with a new date, so the same job can appear again as new.
- Assumes a CV-only match serves the owner; false if they want to change direction, since a CV only shows what they have done so far.

## 7. Recommendation

Build a personal tool that takes the owner's CV plus the inputs position, salary range and posted-since date, reads LinkedIn's public vacancy pages, asks an AI to judge each vacancy against the CV, and returns a list of apply links sorted by fit, each with a one-line reason. It remembers what it already showed and lists only new vacancies on later runs, with a "show everything" option. Every run ends with an honest coverage report (how many read, how many judged, how many without salary, and a loud warning when the source returned nothing or looks blocked). Company career pages as a second source are the chosen next step after this works.

## 8. Open questions

- Which country, city or remote preference should the search cover, and is location one of the "more filters later"? Owner: Serhii Lyzun.
- What form does the CV take (which file, how much detail), and should a separate "what I want next" note (direction, things to avoid) sit beside it? The owner did not choose this twist. Owner: Serhii Lyzun.
- How is the tool run and where do the results appear (on demand or on a schedule, in a file or in the terminal)? Not discussed. Owner: Serhii Lyzun.
- How many vacancies per run is acceptable to judge, given each AI judgment has a cost and a delay? Owner: Serhii Lyzun.
- What counts as "posted from date" when LinkedIn only shows coarse ages such as "2 weeks ago"? Owner: Serhii Lyzun.
- Which company career pages go on the target-company list, and when does that work start? Owner: Serhii Lyzun.
