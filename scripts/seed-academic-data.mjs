import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const dataPath = resolve(args.find((arg) => !arg.startsWith("--")) ?? "scripts/academic-seed.json");
const passThroughFlags = args.filter((arg) => arg.startsWith("--"));

if (!existsSync(dataPath)) {
  console.error(`Seed file not found: ${dataPath}`);
  console.error("Create it from scripts/academic-seed.template.json using real course data.");
  process.exit(1);
}

const seedData = JSON.parse(readFileSync(dataPath, "utf8"));
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const convexArgs = [
  "exec",
  "convex",
  "run",
  ...passThroughFlags,
  "seedAcademic:seedAcademicData",
  JSON.stringify(seedData),
];

const result = spawnSync(pnpmCommand, convexArgs, {
  stdio: "inherit",
  shell: false,
});

process.exit(result.status ?? 1);
