# Grok plugin (this fork)

This fork tracks `mattpocock/skills` and adds a native Grok plugin. Do not restructure buckets. Grok's promoted set is the `skills` array, the same list as `.claude-plugin/plugin.json`.

## Install

```bash
grok plugin install witooh/matt-skills --trust
grok plugin enable mattpocock-skills
```

`grok plugin install mattpocock-skills` resolves to the official marketplace entry for `mattpocock/skills` (source `https://github.com/mattpocock/skills.git`, which Grok reads from Claude Code's official marketplace). Use the commands above for this fork.

Update and remove:

```bash
grok plugin update mattpocock-skills
grok plugin uninstall mattpocock-skills --confirm
```

Orgs that set `[marketplace] require_sha = true` must pin a 40-character `sha` on the url source in `.grok-plugin/marketplace.json` before an install by catalog name will succeed. Direct `grok plugin install witooh/matt-skills@<full-sha> --trust` satisfies the same rule.

## Why the manifest looks like this

Measured on Grok 1.0.40:

| Fact | What it means here |
|---|---|
| `.grok-plugin/plugin.json` wins over `.claude-plugin/plugin.json` | The Grok file must carry the same `skills` array. A manifest with no `skills` field walks `skills/` recursively and loads `misc/`, `in-progress/`, and `deprecated/`. |
| `skills` entries are directory paths | `./skills/engineering/<name>` is a real directory. Install does not depend on the one-level `skills/<name>` symlinks (those are the Oh My Pi overlay; a local copy drops them). |
| Marketplace path `.` or `./` | Grok warns `marketplace path is empty` and drops the entry. The catalog source is `{ "source": "url", "url": "https://github.com/witooh/matt-skills.git" }`. |
| Plugin name `mattpocock-skills` | Same name as the official listing. Install by repository, not by that bare name. |

`.grok-plugin/plugin.json` is a byte copy of `.claude-plugin/plugin.json`, including the upstream `repository` field. `scripts/sync-grok-plugin.mjs` rewrites the copy and checks the marketplace URL.

## Local / development

```bash
grok plugin install . --trust
grok plugin enable mattpocock-skills
```

That copies this working tree. `grok plugin marketplace add .` then `install mattpocock-skills` does not: the catalog entry is the GitHub URL, so it clones `origin`.

## After `git merge upstream/main`

1. `npm run sync-grok-plugin` if `.claude-plugin/plugin.json` changed.
2. `npm run check-plugin-version` (includes this copy, the Oh My Pi aliases, and `grok plugin validate` when `grok` is on PATH).
