---
status: Accepted
owner: "Serhii Lyzun"
reviewers: []
updated_at: "2026-09-19"
feature_size: "n/a (repo foundation)"
ticket: ""
---

# 0001 — Use TypeScript on Node 22 for the command-line tool

- **Status:** Accepted
- **Date:** 2026-09-19
- **Deciders:** Serhii Lyzun, with Claude during the survey foundation session

## Context

The idea brief describes a personal command-line tool that reads vacancy pages, asks an AI to judge each one against a CV, remembers what it has shown, and prints apply links. The repository is empty, so the language and runtime are the first irreversible choice: changing them later means rewriting everything.

## Decision drivers

- The tool is personal and small, so the fewest moving parts wins (`docs/idea-brief.md` §3, §4).
- The owner's IDE project was created as a web module, and Node 22 is already installed on the owner's machine.
- Multi-site is the stated direction (`docs/idea-brief.md` §2); a shared language would carry over if a UI is ever added.
- The AI vendor's official SDK exists for the language.

## Considered options

1. **TypeScript on Node 22** — fetch built in, an HTML parser library for pages, the official Anthropic SDK, a SQLite driver library, vitest for tests, eslint for lint.
2. **Python 3.13 with uv** — the shortest path for parsing and PDF reading, SQLite built in, pytest and ruff; the owner did not pick it.

## Decision outcome

**Chosen:** TypeScript on Node 22, as an ES-module project run and built with npm. It matches the owner's IDE setup and keeps a possible web UI in the same language, at the price of a few extra libraries.

## Consequences

**Positive**
- One language end to end if a UI is added later.
- Strict types describe the shared vacancy shape that every source must produce.

**Negative**
- Reading a PDF or Word CV and using SQLite each need an extra library, so there is a little more setup than in Python.
- A build step (compile to JavaScript) sits between the code and running it.

**Neutral**
- Switching to Python later is possible but is a full rewrite; nothing in the design depends on TypeScript-only features.

## Links

- Idea brief: [[../idea-brief.md]] §2, §3, §4
- Map: [[../architecture-map.md]] (Stack)
- Related ADR: [[0002-organize-code-as-one-folder-per-vacancy-source]], [[0003-keep-seen-memory-in-a-local-sqlite-file]]
