import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { currentVersion, loadMigrations, migrate } from "../src/store/migrate.js";

let workdir: string;
let db: Database.Database;

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), "vacancy-migrate-"));
  db = new Database(join(workdir, "seen.sqlite"));
});

afterEach(() => {
  db.close();
  rmSync(workdir, { recursive: true, force: true });
});

describe("migration runner", () => {
  it("applies the baseline and reverts it: user_version 0 -> 1 -> 0", () => {
    expect(currentVersion(db)).toBe(0);

    expect(migrate(db)).toBe(1);
    expect(currentVersion(db)).toBe(1);

    expect(migrate(db, 0)).toBe(0);
    expect(currentVersion(db)).toBe(0);
  });

  it("is a no-op when already at the target", () => {
    migrate(db);
    expect(migrate(db)).toBe(1);
  });

  it("rolls back a failing migration and keeps the previous version", () => {
    const dir = join(workdir, "migrations");
    mkdirSync(dir);
    writeFileSync(join(dir, "0001_a.up.sql"), "CREATE TABLE a (id INTEGER);");
    writeFileSync(join(dir, "0001_a.down.sql"), "DROP TABLE a;");
    writeFileSync(join(dir, "0002_b.up.sql"), "CREATE TABLE b (id INTEGER); THIS IS NOT SQL;");
    writeFileSync(join(dir, "0002_b.down.sql"), "DROP TABLE b;");

    expect(() => migrate(db, undefined, dir)).toThrow();
    expect(currentVersion(db)).toBe(1);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
    expect(tables).toEqual([{ name: "a" }]);
  });

  it("refuses a migration without its down file", () => {
    const dir = join(workdir, "migrations");
    mkdirSync(dir);
    writeFileSync(join(dir, "0001_a.up.sql"), "SELECT 1;");

    expect(() => loadMigrations(dir)).toThrow(/both \.up\.sql and \.down\.sql/);
  });

  it("refuses gaps in the numbering", () => {
    const dir = join(workdir, "migrations");
    mkdirSync(dir);
    writeFileSync(join(dir, "0002_a.up.sql"), "SELECT 1;");
    writeFileSync(join(dir, "0002_a.down.sql"), "SELECT 1;");

    expect(() => loadMigrations(dir)).toThrow(/without gaps/);
  });
});
