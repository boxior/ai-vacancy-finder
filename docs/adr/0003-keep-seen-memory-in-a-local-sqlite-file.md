---
status: Accepted
owner: "Serhii Lyzun"
reviewers: []
updated_at: "2026-09-19"
feature_size: "n/a (repo foundation)"
ticket: ""
---

# 0003 — Keep the seen-vacancies memory in a local SQLite file with paired SQL migrations

- **Status:** Accepted
- **Date:** 2026-09-19
- **Deciders:** Serhii Lyzun, with Claude during the survey foundation session

## Context

Later runs must show only vacancies not shown before (`docs/idea-brief.md` §6, §7), and must catch the same job reposted with a new date, so the tool has to store something between runs. It is a single-user tool on one machine, so the storage should need no server and no account.

## Decision drivers

- One user, one machine, no server to run (`docs/idea-brief.md` §3).
- Repost detection needs lookups by site job number and by company plus title, which a flat file does poorly.
- The stored data will grow features (fit scores, statuses); schema changes need a history.

## Considered options

1. **A local SQLite database file, driven by the better-sqlite3 library** — a native library with prebuilt binaries for current Node versions.
2. **A local SQLite database through Node's built-in module** — no extra library, but the built-in module was experimental and flag-gated on the installed Node 22.9.
3. **A plain JSON file** — simplest to start, but no indexed lookups and no schema history.

## Decision outcome

**Chosen:** Option 1. Schema changes are kept as numbered paired files (`NNNN_name.up.sql` and `NNNN_name.down.sql`) applied by a small in-repo runner that records the applied version in SQLite's own `user_version` setting. Vacancy identity is the source name plus the site's own job number, with a company-plus-title fingerprint stored beside it for repost detection.

## Consequences

**Positive**
- No server or account; the whole memory is one file that can be deleted to reset it.
- Indexed lookups make "seen before?" and repost detection cheap.
- Paired up/down files match the convention the `data-model` stage later detects and follows.

**Negative**
- better-sqlite3 is a native library; if no prebuilt binary matches the machine, installing it needs a build toolchain.
- A tiny migration runner is our own code to maintain.

**Neutral**
- Moving to the built-in SQLite module later is a small swap once it is stable, because the storage sits behind the seen-store interface from ADR 0002.

## Links

- Idea brief: [[../idea-brief.md]] §3, §6, §7
- Map: [[../architecture-map.md]] (Datastores)
- Related ADR: [[0001-use-typescript-on-node-22]], [[0002-organize-code-as-one-folder-per-vacancy-source]]
