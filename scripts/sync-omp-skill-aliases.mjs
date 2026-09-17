#!/usr/bin/env node
// One-level `skills/<name>` git symlinks so omp's git-installed plugin
// discovery (`skills/<name>/SKILL.md`, not nested buckets) sees the promoted
// set. Source of truth is `.claude-plugin/plugin.json`'s `skills` array.
// Runs as part of `npm run check-plugin-version`. With --check it changes
// nothing and exits 1 on drift.

import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = join(repo, "skills");
const pluginPath = join(repo, ".claude-plugin", "plugin.json");
const check = process.argv.includes("--check");

const BUCKETS = new Set([
  "engineering",
  "productivity",
  "misc",
  "in-progress",
  "deprecated",
]);

const { skills } = JSON.parse(readFileSync(pluginPath, "utf8"));
if (!Array.isArray(skills) || skills.length === 0) {
  console.error(`No skills array in ${pluginPath}.`);
  process.exit(1);
}

/** @type {Map<string, string>} name -> relative target from skills/ */
const wanted = new Map();
for (const entry of skills) {
  if (typeof entry !== "string" || !entry.startsWith("./skills/")) {
    console.error(`Unexpected skill path ${JSON.stringify(entry)}.`);
    process.exit(1);
  }
  const parts = entry.slice("./skills/".length).split("/");
  if (parts.length !== 2 || !BUCKETS.has(parts[0]) || !parts[1]) {
    console.error(`Skill path is not skills/<bucket>/<name>: ${entry}`);
    process.exit(1);
  }
  const [bucket, name] = parts;
  if (wanted.has(name)) {
    console.error(`Duplicate skill name ${name} in plugin.json.`);
    process.exit(1);
  }
  wanted.set(name, `${bucket}/${name}`);
}

let drift = false;

function report(message) {
  if (check) {
    console.error(message);
    drift = true;
    return;
  }
  console.log(message);
}

for (const [name, target] of wanted) {
  const dest = join(skillsRoot, name);
  const targetPath = join(skillsRoot, target);
  if (!existsSync(join(targetPath, "SKILL.md"))) {
    console.error(`Missing SKILL.md for ${name} at ${target}`);
    process.exit(1);
  }

  let current = null;
  try {
    const stat = lstatSync(dest);
    if (stat.isSymbolicLink()) {
      current = readlinkSync(dest);
    } else {
      console.error(
        `${dest} exists and is not a symlink. Refusing to replace it.`,
      );
      process.exit(1);
    }
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  if (current === target) continue;

  if (check) {
    report(
      current === null
        ? `missing alias skills/${name} -> ${target}`
        : `alias skills/${name} is ${current}, expected ${target}`,
    );
    continue;
  }

  if (current !== null) unlinkSync(dest);
  symlinkSync(target, dest);
  report(
    current === null
      ? `linked skills/${name} -> ${target}`
      : `relinked skills/${name}: ${current} -> ${target}`,
  );
}

for (const entry of readdirSync(skillsRoot, { withFileTypes: true })) {
  if (BUCKETS.has(entry.name) || entry.name.startsWith(".")) continue;
  if (!entry.isSymbolicLink()) continue;
  if (wanted.has(entry.name)) continue;

  const dest = join(skillsRoot, entry.name);
  if (check) {
    report(`stale alias skills/${entry.name} -> ${readlinkSync(dest)}`);
    continue;
  }
  unlinkSync(dest);
  report(`removed stale alias skills/${entry.name}`);
}

if (check && drift) {
  console.error("Run `node scripts/sync-omp-skill-aliases.mjs`.");
  process.exit(1);
}

if (check) {
  console.log(
    `omp skill aliases in sync (${wanted.size} promoted skills)`,
  );
}
