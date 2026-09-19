import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Runs the built CLI (`npm test` builds first via `pretest`), so this proves the real entry point boots.
const CLI = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

describe("cli smoke", () => {
  it("boots and prints help with exit code 0", () => {
    const run = spawnSync(process.execPath, [CLI, "--help"], { encoding: "utf8" });

    expect(run.status).toBe(0);
    expect(run.stdout).toContain("Usage:");
  });

  it("rejects an unknown option with exit code 2", () => {
    const run = spawnSync(process.execPath, [CLI, "--bogus"], { encoding: "utf8" });

    expect(run.status).toBe(2);
    expect(run.stderr).toContain("--bogus");
  });
});
