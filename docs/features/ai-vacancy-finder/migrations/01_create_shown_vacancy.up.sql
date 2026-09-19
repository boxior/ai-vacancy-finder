-- The seen memory: one row per vacancy that was actually shown to the job seeker.
-- Identity is the source name plus the site's own job number (repo ADR 0003);
-- repost_fingerprint is the company-plus-title fingerprint built by src/domain (AC-19).
-- Never holds CV text (spec §6.1). Written only through src/store/.
CREATE TABLE IF NOT EXISTS shown_vacancy (
  source             TEXT NOT NULL CHECK (length(source) > 0),
  job_id             TEXT NOT NULL CHECK (length(job_id) > 0),
  repost_fingerprint TEXT NOT NULL CHECK (length(repost_fingerprint) > 0),
  first_shown_at     TEXT NOT NULL,
  PRIMARY KEY (source, job_id)
) STRICT, WITHOUT ROWID;

-- Repost lookup (sad §6 flows 7 and 8). Not unique: two vacancies shown in the same search
-- may share a fingerprint (AC-19).
CREATE INDEX IF NOT EXISTS idx_shown_vacancy_repost_fingerprint
  ON shown_vacancy (repost_fingerprint);
