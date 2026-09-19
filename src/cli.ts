#!/usr/bin/env node
import { parseArgs } from "node:util";

const HELP = `ai-vacancy-finder — find vacancies and judge their fit against your CV

Usage:
  ai-vacancy-finder [options]

Options:
  -h, --help    Show this help and exit
`;

// The composition root: concrete adapters (sources, fit judge, seen-store) are wired here, once.
export function main(argv: string[]): number {
  let help: boolean | undefined;
  try {
    ({
      values: { help },
    } = parseArgs({
      args: argv,
      options: { help: { type: "boolean", short: "h" } },
      strict: true,
    }));
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n\n${HELP}`);
    return 2;
  }

  if (help || argv.length === 0) {
    process.stdout.write(HELP);
    return 0;
  }
  return 0;
}

process.exitCode = main(process.argv.slice(2));
