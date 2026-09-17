# Oh My Pi overlay (this fork)

This fork tracks `mattpocock/skills` and adds an Oh My Pi git plugin. Do not restructure buckets. Do not put the one-level tree in a differently named folder: `omp-plugins` only scans `<package-root>/skills/<name>/SKILL.md`.

## Install

```bash
omp plugin install github:witooh/matt-skills
```

Local dev: `omp plugin link .` (not `bun add /path`; that copy drops directory symlinks).

## Overlay (additive, merge-friendly)

| Piece | Why |
|---|---|
| `package.json` `omp` field | Runtime skips packages without `omp` / `pi`. |
| `skills/<name> -> <bucket>/<name>` git symlinks | omp git-install is one-level; upstream keeps `skills/<bucket>/<name>`. Upstream has no `skills/tdd`, so these files do not collide. |
| `scripts/sync-omp-skill-aliases.mjs` | Regenerates aliases from `.claude-plugin/plugin.json`. |

Do not invert to `buckets/` plus a flat `skills/`. Upstream will keep adding `skills/engineering/<name>/` and every merge will fight that tree.

## After `git merge upstream/main`

1. `npm run sync-omp-skill-aliases` if plugin.json gained or lost a promoted skill.
2. `npm run check-plugin-version`
3. Resolve leftover conflicts only in files this fork owns: `package.json` (`omp` + scripts), README / install-block omp sections, this file.

`CLAUDE.md` stays identical to upstream on purpose.
