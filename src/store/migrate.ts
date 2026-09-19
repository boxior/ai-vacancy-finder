import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";

// Resolves to <repo>/migrations from both src/store/ and dist/store/.
export const DEFAULT_MIGRATIONS_DIR = fileURLToPath(new URL("../../migrations", import.meta.url));

interface Migration {
  version: number;
  name: string;
  up: string;
  down: string;
}

const FILE_PATTERN = /^(\d{4})_(.+)\.(up|down)\.sql$/;

export function loadMigrations(dir: string = DEFAULT_MIGRATIONS_DIR): Migration[] {
  const byVersion = new Map<number, Partial<Migration>>();

  for (const file of readdirSync(dir)) {
    const match = FILE_PATTERN.exec(file);
    if (!match) continue;
    const [, digits, name, direction] = match as unknown as [string, string, string, "up" | "down"];
    const version = Number(digits);
    const entry = byVersion.get(version) ?? { version, name };
    if (entry.name !== name) {
      throw new Error(`Migration ${digits} has two different names: ${entry.name} and ${name}`);
    }
    entry[direction] = readFileSync(join(dir, file), "utf8");
    byVersion.set(version, entry);
  }

  const versions = [...byVersion.keys()].sort((a, b) => a - b);
  versions.forEach((version, index) => {
    if (version !== index + 1) {
      throw new Error(`Migrations must be numbered 0001.. without gaps; found ${version} at position ${index + 1}`);
    }
  });

  return versions.map((version) => {
    const entry = byVersion.get(version)!;
    if (entry.up === undefined || entry.down === undefined) {
      throw new Error(`Migration ${String(version).padStart(4, "0")}_${entry.name} needs both .up.sql and .down.sql`);
    }
    return entry as Migration;
  });
}

export function currentVersion(db: Database.Database): number {
  return db.pragma("user_version", { simple: true }) as number;
}

// Moves the database to `target` (default: latest) one migration at a time, each in its own transaction.
export function migrate(
  db: Database.Database,
  target?: number,
  dir: string = DEFAULT_MIGRATIONS_DIR,
): number {
  const migrations = loadMigrations(dir);
  const goal = target ?? migrations.length;
  if (!Number.isInteger(goal) || goal < 0 || goal > migrations.length) {
    throw new Error(`Target version ${goal} is outside 0..${migrations.length}`);
  }

  let version = currentVersion(db);
  if (version > migrations.length) {
    throw new Error(`Database is at version ${version}, newer than the ${migrations.length} known migrations`);
  }

  while (version !== goal) {
    const step = version < goal ? migrations[version]! : migrations[version - 1]!;
    const next = version < goal ? version + 1 : version - 1;
    db.transaction(() => {
      db.exec(version < goal ? step.up : step.down);
      db.pragma(`user_version = ${next}`);
    })();
    version = next;
  }
  return version;
}
