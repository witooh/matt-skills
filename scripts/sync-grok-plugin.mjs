#!/usr/bin/env node
// Keeps .grok-plugin/plugin.json a byte copy of .claude-plugin/plugin.json.
// Grok reads .grok-plugin/plugin.json first. With no skills array it walks
// skills/ recursively and would ship misc/, in-progress/, and deprecated/.
// The copy is what keeps the promoted-only list. Marketplace source "." and
// "./" are rejected ("marketplace path is empty"); the catalog entry is a
// git URL checked here, not generated.
// With --check it changes nothing and exits 1 on drift.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const claudePath = join(repo, ".claude-plugin", "plugin.json");
const grokPath = join(repo, ".grok-plugin", "plugin.json");
const marketPath = join(repo, ".grok-plugin", "marketplace.json");
const check = process.argv.includes("--check");

const FORK_GIT_URL = "https://github.com/witooh/matt-skills.git";

const claudeRaw = readFileSync(claudePath, "utf8");
const claude = JSON.parse(claudeRaw);

let pluginDrift = false;
let marketDrift = false;

function reportPlugin(message) {
  console.error(message);
  pluginDrift = true;
}

function reportMarket(message) {
  console.error(message);
  marketDrift = true;
}

const grokRaw = existsSync(grokPath) ? readFileSync(grokPath, "utf8") : null;
if (grokRaw !== claudeRaw) {
  if (check) {
    reportPlugin(
      grokRaw === null
        ? "missing .grok-plugin/plugin.json"
        : ".grok-plugin/plugin.json differs from .claude-plugin/plugin.json",
    );
  } else {
    writeFileSync(grokPath, claudeRaw);
    console.log(
      "copied .claude-plugin/plugin.json -> .grok-plugin/plugin.json",
    );
  }
} else if (!check) {
  console.log(".grok-plugin/plugin.json already matches");
}

const market = JSON.parse(readFileSync(marketPath, "utf8"));
const listed = Array.isArray(market.plugins) ? market.plugins : [];
if (listed.length !== 1) {
  reportMarket(
    `.grok-plugin/marketplace.json must list exactly one plugin, found ${listed.length}`,
  );
} else {
  const entry = listed[0];
  if (entry.name !== claude.name) {
    reportMarket(
      `marketplace plugin name is ${JSON.stringify(entry.name)}, plugin.json is ${JSON.stringify(claude.name)}`,
    );
  }
  const source = entry.source;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    reportMarket("marketplace source must be an object with source=url");
  } else {
    if (source.source !== "url") {
      reportMarket(
        `marketplace source.source must be "url", found ${JSON.stringify(source.source)}`,
      );
    }
    if (source.url !== FORK_GIT_URL) {
      reportMarket(
        `marketplace url must be ${FORK_GIT_URL}, found ${JSON.stringify(source.url)}`,
      );
    }
    if (source.path === "." || source.path === "./") {
      reportMarket(
        `marketplace path ${JSON.stringify(source.path)} is rejected: marketplace path is empty`,
      );
    }
  }
}

if (pluginDrift) {
  console.error("Run `node scripts/sync-grok-plugin.mjs`.");
}
if (marketDrift) {
  console.error("Edit .grok-plugin/marketplace.json. The sync script does not rewrite it.");
}
if (pluginDrift || marketDrift) {
  process.exit(1);
}

if (check) {
  console.log(
    `grok plugin.json matches claude plugin.json (${claude.skills.length} skills)`,
  );
}

const grok = spawnSync("grok", ["plugin", "validate", repo], {
  encoding: "utf8",
});
if (grok.error && grok.error.code === "ENOENT") {
  console.log("grok CLI not on PATH; skipped grok plugin validate");
  process.exit(0);
}
if (grok.status !== 0) {
  console.error(
    `grok plugin validate failed:\n${grok.stdout || ""}${grok.stderr || ""}`,
  );
  process.exit(grok.status || 1);
}
if (!/Plugin manifest is valid/i.test(grok.stdout || "")) {
  console.error(
    `grok plugin validate did not report a valid manifest:\n${grok.stdout || ""}`,
  );
  process.exit(1);
}
console.log((grok.stdout || "").trim());
