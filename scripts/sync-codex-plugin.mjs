#!/usr/bin/env node
// Generates the Codex manifest from Claude's promoted skill list.
// Codex supports explicit skill paths, so real bucket directories can be used.
// With --check it changes nothing and exits 1 on manifest or catalog drift.

import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const pluginPath = join(repo, ".codex-plugin", "plugin.json");
const marketPath = join(repo, ".agents", "plugins", "marketplace.json");
const claude = JSON.parse(readFileSync(join(repo, ".claude-plugin", "plugin.json"), "utf8"));
const { version } = JSON.parse(readFileSync(join(repo, "package.json"), "utf8"));
const check = process.argv.includes("--check");
let failed = false;

function fail(message) {
  console.error(message);
  failed = true;
}

const promoted = ["engineering", "productivity"].flatMap((bucket) =>
  readdirSync(join(repo, "skills", bucket), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(repo, "skills", bucket, entry.name, "SKILL.md")))
    .map((entry) => `./skills/${bucket}/${entry.name}`),
);
if (!Array.isArray(claude.skills) ||
    JSON.stringify([...claude.skills].sort()) !== JSON.stringify(promoted.sort())) {
  fail(".claude-plugin/plugin.json must list every promoted skill exactly once, with no other paths");
}
for (const rel of promoted) {
  if (!lstatSync(join(repo, rel, "SKILL.md")).isFile()) {
    fail(`${rel}/SKILL.md must be a regular file so Codex can cache it`);
  }
}

const expected = {
  ...claude,
  version,
  repository: "https://github.com/witooh/matt-skills",
  interface: {
    displayName: "Matt Pocock Skills",
    shortDescription: "Skills for real engineering",
    longDescription: claude.description,
    developerName: claude.author.name,
    category: "Developer Tools",
    capabilities: [],
  },
};
const expectedRaw = `${JSON.stringify(expected, null, 2)}\n`;
const actualRaw = existsSync(pluginPath) ? readFileSync(pluginPath, "utf8") : null;
if (actualRaw !== expectedRaw) {
  if (check) {
    fail(".codex-plugin/plugin.json is missing or out of sync. Run `npm run sync-codex-plugin`.");
  } else if (!failed) {
    mkdirSync(dirname(pluginPath), { recursive: true });
    writeFileSync(pluginPath, expectedRaw);
    console.log("generated .codex-plugin/plugin.json from the promoted set");
  }
}

const market = JSON.parse(readFileSync(marketPath, "utf8"));
if (market.name !== "witooh-matt-skills" ||
    market.interface?.displayName !== "Matt Skills (Witooh fork)") {
  fail(".agents/plugins/marketplace.json must identify the witooh-matt-skills marketplace");
}
const listed = Array.isArray(market.plugins) ? market.plugins : [];
if (listed.length !== 1 || listed[0].name !== claude.name ||
    listed[0].source?.source !== "local" || listed[0].source?.path !== "./" ||
    listed[0].policy?.installation !== "AVAILABLE" ||
    listed[0].policy?.authentication !== "ON_USE" ||
    listed[0].category !== "Developer Tools") {
  fail(".agents/plugins/marketplace.json must list the local mattpocock-skills plugin at ./ with AVAILABLE/ON_USE policy");
}

if (failed) process.exit(1);
console.log(`Codex plugin manifest matches the promoted set (${promoted.length} skills, version ${version})`);
