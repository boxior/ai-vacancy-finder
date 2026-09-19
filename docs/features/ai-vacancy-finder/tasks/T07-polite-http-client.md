---
id: T7
title: "Build the shared polite HTTP client: pace, back-off and typed refusals"
layer: "infra"
deps: ["T1", "T4"]
blocks: ["T10", "T11"]
acs: ["AC-23"]
files_hint: ["src/sources/http.ts", "test/sources/http.test.ts"]
owner: "Serhii Lyzun"
estimate: "M"
context_budget: "M"
status: "todo"
---

<!-- To the executing agent: work from what is inlined here. If a slice is insufficient, ambiguous,
or contradicts the code in front of you, open the named file for the full text and follow that.
Do not invent the missing part. Every inline is a snapshot with a provenance signature; the source wins. -->

# T7 — Build the shared polite HTTP client: pace, back-off and typed refusals

## Place in the sequence

- **Blocked by:** T1 — Define the vacancy shape, the search input type, the clock and the repost fingerprint, T4 — Define the three seam interfaces with their typed failures, the test fakes, and fix the fail-loudly wording · **Blocks:** T10 — Parse LinkedIn results pages into cards and list them with typed stops, T11 — Parse LinkedIn detail pages, assemble the LinkedIn source and register it · **Wave:** 4, its last dependency, T4, sits in wave 3.
- **Lane:** Own lane.

## Why (user story)

> **As a** Job seeker
> **I want** every run to end with a coverage report and a loud warning when a source returned nothing or only part
> **So that** a quiet or partial read never looks like "no jobs for you"
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task makes a source that slows down or refuses requests back off, then report itself as throttled, instead of being hammered or silently dropped.

## Inlined context

> **Chosen:** Option 1. Pace and back-off are written and tested once, so a new source cannot forget them, and the numbers of spec §6 live in one place.
>
> […]
>
> 1. **One shared client with an injected `Clock`** — `src/sources/http.ts` creates one client per source with its own pace counter; it holds requests to at most one per second, retries up to 3 times with growing pauses within 1 minute in total, and maps refusals to the typed stop kinds. Each adapter passes in a small classifier that says what its site's sign-in wall or refusal looks like. `Clock` (now, sleep) is injected so tests advance time instantly.
>
> — `adr/0006 §Decision outcome, chosen option and option 1, abridged` · full text: [adr/0006](../adr/0006-share-one-polite-http-client-across-sources-with-an-injected-clock.md)

> | Aspect | Target | Measurement |
> |---|---|---|
> | Request pace toward a source | ≤ 1 page request per second, counted for each source separately | offline test against a fake clock |
> | Throttle back-off | ≤ 3 retries per refused request and ≤ 1 min of total waiting per source, then the source is reported as throttled | offline test against a fake clock |
>
> — `spec.md §6, NFR: pace and back-off, verbatim` · full text: [spec.md](../spec.md)

> - Source slows or refuses requests: the tool backs off, reports the source as throttled, and never retries in a tight loop.
>
> — `spec.md §6.1, abuse case, source slows or refuses, verbatim` · full text: [spec.md](../spec.md)

> Once a source has stopped, the shared HTTP client refuses further requests to it without waiting, so vacancies not yet hydrated are reported as not judged with the source's cause.
>
> — `sad.md §6, runtime view intro, a stopped source, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full ([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) · [cli.md](../contracts/cli.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface of its own; the stop kinds are the ones the CLI contract fixes.

> | Code | Meaning | Fails the run | AC |
> |---|---|---|---|
> | `source.blocked` | A sign-in page instead of public results; never bypassed | yes | AC-04 |
> | `source.throttled` | Refused after ≤ 3 retries and ≤ 1 min of waiting per source | yes | AC-23 |
> | `source.failed` | Error or unreadable page | yes | AC-11 |
>
> — `contracts/cli.md §6.2, Source stops, abridged` · full text: [cli.md](../contracts/cli.md)

## Acceptance criteria

### AC-23 — error

> **Given** the source slows down or refuses requests because it is being asked too often
> **When** the search runs
> **Then** the system slows its requests down and, once the retry allowance of §6 is used up, reports the source as throttled in the coverage report with a loud warning, marks the run as failed (AC-11), lists only what was read before, and does not retry in a tight loop
>
> — `spec.md §5, AC-23, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `src/sources/http.ts`: `createHttpClient({ clock, fetch?, classify })` → `{ get(url): Promise<{ ok: true; status; body } | { stop: SourceStop }> }`; one client per source, each with its own pace state
- [ ] Pace: at least 1000 ms between the starts of two requests of the same client, using `clock.now()` and `clock.sleep()`
- [ ] `classify(response | error)` is supplied by the adapter and says `ok`, a refusal (throttle), `blocked` (its site's sign-in wall) or `failed`; the default treats HTTP 429 as a refusal and any other non-2xx, network error or timeout as `failed`
- [ ] Back-off on a refusal: at most 3 retries with growing pauses (for example 5 s, 10 s, 20 s), at most 60 s of total back-off waiting per source; honour `Retry-After` but never wait past the remaining budget — when it would, stop `throttled` at once
- [ ] Stopped state: after any stop, every later `get()` returns that same stop immediately, with no fetch and no sleep
- [ ] `test/sources/http.test.ts` with `FakeClock` and a fake `fetch` — no network

## Edge cases

| Case | Behaviour |
|---|---|
| 429, then 200 | waits once, returns the body |
| Refused on the first request and on all 3 retries | stop `throttled` after the third retry; total back-off ≤ 60 s; no fifth fetch |
| `Retry-After` longer than the remaining budget | stop `throttled` immediately, no sleep beyond the budget |
| Sign-in page recognised by the adapter's classifier | stop `blocked`, never retried, never signs in |
| Network error or timeout | stop `failed`; a per-request timeout is not in the spec — add one (for example 30 s) and note it in the PR |
| A call after a stop | same stop returned at once, zero fetches, zero sleeps |
| Two sources | separate pace counters — one source's pace never delays the other |
| Pace delays | do not count toward the 60 s back-off budget |

## Definition of Done

- [ ] tests against a fake clock prove: ≤ 1 request per second, ≤ 3 retries, ≤ 60 s of back-off, throttled stop, stopped state
- [ ] no tight retry loop exists (the test asserts each retry is preceded by a sleep)
- [ ] `npm run lint` and `npm run build` clean (the per-task gate)
