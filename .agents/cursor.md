# Cursor plugin (this fork)

Cursor adds this repo from GitHub with `/add-plugin`. It reads `.cursor-plugin/marketplace.json` first, then the plugin at `source: "./"`, which is `.cursor-plugin/plugin.json`.

## Install

```text
/add-plugin https://github.com/witooh/matt-skills
```

That creates a personal marketplace for this repo. Install `mattpocock-skills` from it. Refresh the marketplace to pick up later commits. This is not a listing on cursor.com/marketplace.

## Why skills is two bucket paths

Cursor treats each `skills` entry as a directory to scan. A child directory that contains `SKILL.md` is a skill. `"skills": "./skills/"` would also load `misc/`, `in-progress/`, and `deprecated/`, and it would see the one-level `skills/<name>` symlinks (the Oh My Pi overlay) as a second copy of every promoted skill.

`.cursor-plugin/plugin.json` therefore lists only:

- `./skills/engineering`
- `./skills/productivity`

Those are real directories, not the omp symlinks. `scripts/check-cursor-plugin.mjs` fails if a promoted skill in `.claude-plugin/plugin.json` sits outside those two roots, or if the Cursor `skills` array changes.

Do not add a third path without updating that check. Do not point `skills` at `./skills/`.

## Version

`version` tracks `package.json`. `node scripts/sync-plugin-version.mjs` writes both `.claude-plugin/plugin.json` and `.cursor-plugin/plugin.json`. `npm run check-plugin-version` includes the Cursor check.

## Cloud Agents

`/add-plugin` does not run inside a Cloud Environment install script. Cloud Agents scan `~/.cursor/skills/<name>/SKILL.md` on the VM. From a checkout:

```bash
./scripts/install-cursor-cloud.sh
```

The script copies the promoted set, flattened, into `~/.cursor/skills`. Re-running is safe. It removes only names it previously wrote that left the promoted set. A new Build is required before a later commit is visible, because the install script's disk state is snapshotted.
