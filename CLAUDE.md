# ai-vacancy-finder

A command-line tool: given a position, a salary range and a posted-since date, it reads public vacancy
pages, judges each new vacancy's fit against the owner's CV with Claude, and prints fit-sorted apply
links plus a coverage report. Intent: `docs/idea-brief.md`. Architecture: `docs/architecture-map.md`
(the reference) and `docs/adr/`.

## Commands

| Task | Command |
|---|---|
| Install | `npm install` (CI: `npm ci`) |
| Build | `npm run build` (tsc → `dist/`) |
| Test | `npm test` (builds first via `pretest`, then vitest) |
| Lint | `npm run lint` (eslint) |
| Run | `node dist/cli.js --help` |

TypeScript on Node 22, ES modules: relative imports in `src/` and `test/` end in `.js`.

## The three seams

Three small interfaces are the only extension points. Concrete adapters are wired once, in `src/cli.ts`.

- **Vacancy source** (`src/sources/<site>/`) — one folder per site, returns the shared vacancy shape
  (`src/domain/`) or a typed error. Register new sources in `src/sources/index.ts`.
- **Fit judge** (`src/matching/`) — CV plus vacancy in, fit score plus one-line reason out. The Anthropic
  client lives here and nowhere else.
- **Seen-store** (`src/store/`) — seen-memory and repost fingerprint. Only `src/store/` touches the
  SQLite file.

## Rules

- **Fail loudly.** A source that fails or returns nothing raises a typed error that the coverage report
  shows. Never swallow an error; never print an empty list without its coverage line.
- **Offline tests.** Sources are tested against saved real pages in `test/fixtures/`, never the live
  site. The fit judge is tested against a fake. No test touches the network.
- **Secrets.** The AI key comes from the `ANTHROPIC_API_KEY` environment variable. Never commit a key
  or a `.env` file (both are gitignored).
- **Migrations.** `migrations/NNNN_name.up.sql` with a matching `.down.sql`, numbered without gaps,
  applied by the runner in `src/store/migrate.ts`; the version lives in SQLite `user_version`. Change
  the schema by adding a new pair, never by editing an applied one.
- **Salary.** No stated salary → keep the vacancy, tag it "salary not listed", show it below confirmed
  ones. A stated salary outside the range → drop it.
- **Identity.** A vacancy is the source name plus the site's own job number; a company-plus-title
  fingerprint catches reposts.

## Gotchas

- `better-sqlite3` is pinned to the 12.x line (`^12.10.1`): 13.0.3's prebuilt binary segfaults on
  Node 22.9.0 when opening a database. Re-test before moving to 13.
- Reading LinkedIn's public pages is against its terms and may break or be blocked; that trade-off was
  made knowingly (`docs/idea-brief.md` §6).
