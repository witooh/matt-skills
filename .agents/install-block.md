# The canonical install block

One install story, one wording. `README.md`, `.changeset/*`, and every page under `docs/` must say **this** and nothing else. Change it here first, then propagate.

## Managed installs first

Lead with installs that update themselves. Fall back to skills.sh, labelled "manual updates", only for agents that have no such install. Call a route managed only if it updates without the user running a command. Put any one-time opt-in beside its install command. Never promise "instant".

Claude Code installs from its official marketplace, `claude-plugins-official`. Copilot CLI and VS Code use this repo's `.claude-plugin/marketplace.json` and `plugin.json`. Codex uses this fork's `.agents/plugins/marketplace.json` and `.codex-plugin/plugin.json`. The Release workflow runs `npm run version`, which copies the version from `package.json` into the plugin manifests.

| Agent         | Route                            | Updates itself?                                                  |
| ------------- | -------------------------------- | ---------------------------------------------------------------- |
| Claude Code   | `@claude-plugins-official`       | Yes, by default                                                  |
| Codex         | `@witooh-matt-skills` marketplace | No. Run marketplace `upgrade`, then plugin `add`                 |
| Copilot CLI   | `@mattpocock` marketplace        | Yes, after a one-time `autoUpdate: true`                         |
| VS Code       | Chat: Install Plugin From Source | Yes, daily, by default                                           |
| Gemini CLI    | `gemini skills install` (copies) | No. A Gemini extension would need a flat `skills/<name>/` layout |
| Everyone else | skills.sh                        | No. Run `npx skills update`, and re-run `add` for new skills     |

Sources (2026-10-08): Codex `core-plugins/src/manager.rs`; Copilot [cli-config-dir-reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference); VS Code `pluginAutoUpdate.ts`; Gemini `skillLoader.ts`.

Nobody has run Auggie, Droid, Qwen or Goose against this repo, so they stay on skills.sh until someone does.

## Claude Code

<canonical-block name="claude-code">

```bash
claude plugin install mattpocock-skills@claude-plugins-official
```

Updates itself by default.

</canonical-block>

## Grok: the plugin (this fork)

<canonical-block name="grok">

```bash
grok plugin install witooh/matt-skills --trust
grok plugin enable mattpocock-skills
```

</canonical-block>

Grok installs this fork as a git plugin. Re-run `grok plugin update mattpocock-skills` to update. `grok plugin install mattpocock-skills` resolves to the official marketplace entry for `mattpocock/skills`. Use the commands above for this fork. Overlay rules live in [.agents/grok-plugin.md](./grok-plugin.md).

## Oh My Pi: the plugin (this fork)

<canonical-block name="oh-my-pi">

```bash
omp plugin install github:witooh/matt-skills
```

</canonical-block>

Oh My Pi installs this fork as a git plugin. Re-run the same command to update. Overlay rules live in [.agents/omp-plugin.md](./omp-plugin.md).

## Cursor: the plugin (this fork)

<canonical-block name="cursor">

```text
/add-plugin https://github.com/witooh/matt-skills
```

Adds this fork from GitHub. Cursor loads the promoted skills. Refresh the marketplace to pick up later changes.

</canonical-block>

Rules live in [.agents/cursor.md](./cursor.md).

## Kiro: the install script (this fork)

<canonical-block name="kiro">

```bash
./kiro.sh
./kiro.sh --project
```

Run from a checkout of this fork. `./kiro.sh` copies the promoted skills into `~/.kiro/skills`. `./kiro.sh --project` installs into `./.kiro` instead. Re-running overwrites only those skill directories. Other Kiro content is left intact.

</canonical-block>

## Codex: the plugin (this fork)

<canonical-block name="codex">

```bash
codex plugin marketplace add witooh/matt-skills
codex plugin add mattpocock-skills@witooh-matt-skills
```

Installs this fork's promoted skills as a Codex plugin. Start a new Codex session after installing. To update, run `codex plugin marketplace upgrade witooh-matt-skills`, then re-run the plugin add command.

</canonical-block>

From a checkout, use `codex plugin marketplace add .` for the first command. The catalog lives at `.agents/plugins/marketplace.json`. Rules live in [.agents/codex-plugin.md](./codex-plugin.md).

## GitHub Copilot (CLI and VS Code)

Use the marketplace, not `copilot plugin install mattpocock/skills`. Copilot has deprecated direct repo installs, and they can't auto-update. The `extraKnownMarketplaces` entry follows the documented schema, but nobody has run it yet.

<canonical-block name="copilot">

```bash
copilot plugin marketplace add mattpocock/skills
copilot plugin install mattpocock-skills@mattpocock
```

Then, once, add to `~/.copilot/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "mattpocock": { "source": { "source": "github", "repo": "mattpocock/skills" }, "autoUpdate": true }
  }
}
```

In VS Code, run **Chat: Install Plugin From Source** and enter `https://github.com/mattpocock/skills`. It updates daily.

</canonical-block>

## Gemini CLI

Gemini doesn't read `.claude-plugin`, and `--path` takes one bucket. One install per promoted bucket gives exactly the promoted set (27 skills, verified 2026-10-07).

<canonical-block name="gemini">

```bash
gemini skills install https://github.com/mattpocock/skills.git --path skills/engineering
gemini skills install https://github.com/mattpocock/skills.git --path skills/productivity
```

Re-run both commands to update.

</canonical-block>

## Every other agent, or editable files (skills.sh)

`-a` preselects the agent. Each agent in the comment was run on 2026-10-07. Prefer skills.sh to an agent's own repo installer, such as `amp skill add` or `pi install git:…`, because those also pull in `misc/` and `in-progress/`. `npx skills update` skips skills added upstream since `add`, so the block tells users to re-run `add`.

<canonical-block name="other-agents">

```bash
npx skills@latest add mattpocock/skills -a <agent>  # cursor, opencode, devin, windsurf, amp, pi; omit -a to choose
```

When the installer asks which skills to take, include `setup-matt-pocock-skills`. To update, run `npx skills@latest update`, and re-run `add` to pick up new skills.

</canonical-block>

Use the single-skill form wherever one skill is named on its own. `docs/` pages don't use this block, because ai-hero renders the install widget above the page body. See [writing-docs.md](./writing-docs.md).

<canonical-block name="skills-sh-one-skill">

```bash
npx skills@latest add mattpocock/skills --skill=<name>
```

```bash
npx skills@latest update <name>
```

</canonical-block>

`skills@latest` is the pinned spelling everywhere.

## The routes are exclusive

Plugins provide a read-only bundle. skills.sh writes files you own and edit. The Kiro script copies the promoted skills into `.kiro/skills`. Installing more than one route for an agent leaves every skill twice: always say "pick one".

`.grok-plugin/marketplace.json` is the documented Grok catalog for this fork. Its plugin source is a git URL. Grok drops a marketplace path of `.` or `./` (`marketplace path is empty`).
