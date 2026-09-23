#!/usr/bin/env node
// Checks the Cursor plugin points at the promoted buckets only.
// Cursor scans each skills path for child directories that contain SKILL.md.
// Pointing at skills/ would also load misc/, in-progress/, and the omp symlinks.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const pluginPath = join(repo, ".cursor-plugin", "plugin.json");
const marketPath = join(repo, ".cursor-plugin", "marketplace.json");
const claudePath = join(repo, ".claude-plugin", "plugin.json");
const packagePath = join(repo, "package.json");

const PROMOTED = ["./skills/engineering", "./skills/productivity"];
let failed = false;

function fail(message) {
  console.error(message);
  failed = true;
}

const plugin = JSON.parse(readFileSync(pluginPath, "utf8"));
const market = JSON.parse(readFileSync(marketPath, "utf8"));
const claude = JSON.parse(readFileSync(claudePath, "utf8"));
const { version } = JSON.parse(readFileSync(packagePath, "utf8"));

if (plugin.name !== "mattpocock-skills") {
  fail(`Cursor plugin name is ${plugin.name}, expected mattpocock-skills`);
}
if (plugin.version !== version) {
  fail(
    `.cursor-plugin/plugin.json version is ${plugin.version}, package.json is ${version}. Run \`node scripts/sync-plugin-version.mjs\`.`,
  );
}
if (JSON.stringify(plugin.skills) !== JSON.stringify(PROMOTED)) {
  fail(
    `.cursor-plugin/plugin.json skills must be ${JSON.stringify(PROMOTED)} so misc/, in-progress/, and deprecated/ stay out`,
  );
}

for (const rel of plugin.skills ?? []) {
  const dir = join(repo, rel);
  if (!existsSync(dir)) {
    fail(`Cursor skill path does not exist: ${rel}`);
    continue;
  }
  const children = readdirSync(dir, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory(),
  );
  if (!children.some((entry) => existsSync(join(dir, entry.name, "SKILL.md")))) {
    fail(`${rel} has no child skill directory`);
  }
  for (const entry of children) {
    if (!existsSync(join(dir, entry.name, "SKILL.md"))) continue;
    const skillPath = `${rel}/${entry.name}`;
    if (!claude.skills.includes(skillPath)) {
      fail(`${skillPath} would load in Cursor but is not in .claude-plugin/plugin.json`);
    }
  }
}

for (const entry of claude.skills ?? []) {
  if (!PROMOTED.some((root) => entry.startsWith(`${root}/`))) {
    fail(
      `${entry} is promoted in .claude-plugin/plugin.json but is outside the Cursor skill roots`,
    );
  }
}

if (market.name !== "mattpocock-skills") {
  fail(`Cursor marketplace name is ${market.name}, expected mattpocock-skills`);
}
const listed = Array.isArray(market.plugins) ? market.plugins : [];
if (listed.length !== 1 || listed[0].name !== "mattpocock-skills" || listed[0].source !== "./") {
  fail(
    '.cursor-plugin/marketplace.json must list one plugin, mattpocock-skills, with source "./"',
  );
}

if (failed) process.exit(1);
console.log("Cursor plugin manifest matches the promoted set");
