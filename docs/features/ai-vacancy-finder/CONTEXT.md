---
status: Living
updated_at: "2026-09-19"
---

# Domain Context — ai-vacancy-finder

## Glossary

- Coverage report — the closing section of every run that states how many vacancies were read, dropped, judged and not judged, and warns loudly when a source returned nothing or too little. NOT the vacancy list.
- CV — the job seeker's own text document that every fit judgment is made against. NOT a vacancy or a cover letter.
- Date approximate — the tag on a vacancy that shows only a rough age, so its posted date could fall inside or outside the window; it is kept and shown below untagged vacancies. NOT a vacancy known to be older than the window, which is dropped.
- Date not listed — the tag on a vacancy that shows no posted date or age at all; it is kept, shown in the tagged group and counted in the coverage report as kept without a stated date. NOT Date approximate, which needs a rough age to exist, and NOT a vacancy known to be older than the window, which is dropped.
- Fit — how well a vacancy matches the CV, a score with a one-line reason. NOT a filter result — filters drop vacancies, fit only orders them.
- Job seeker — the one person who runs a search with their own CV. NOT an account holder or applicant — the tool never applies for them.
- Judging limit — the most vacancies one search may send to fit judgment, with a default the job seeker can override for a single search. NOT a filter — vacancies over it are not dropped, not judged and not marked seen.
- Read — a vacancy the tool successfully parsed from a source into the shared vacancy shape; every read vacancy is counted in exactly one coverage-report bucket, checked in the order dropped for date, dropped for salary, skipped as already seen, skipped as repost, not judged, judged, so the buckets add up to the read count. NOT judged or seen — a read vacancy may be dropped by a filter, skipped or left unjudged, and only shown ones are seen.
- Repost — the same job published again under a new date or number, recognised by company plus title. NOT a new vacancy.
- Salary not listed — the tag on a vacancy that states no pay, kept and shown below confirmed ones. NOT a salary outside the range, which is dropped.
- Search — one run for a position, salary range, posted-since date and location or remote. NOT the seen memory that persists between runs.
- Seen — a vacancy already shown to the job seeker in an earlier run. NOT merely read, filtered out or left unjudged.
- Source — a site whose public vacancy pages the tool reads. NOT the CV.
- Vacancy — one job posting read from a source, identified by source name plus the site's own job number. NOT a company or a position title.
