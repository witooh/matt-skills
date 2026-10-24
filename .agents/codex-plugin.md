# Codex plugin (this fork)

Codex installs this fork through the catalog at `.agents/plugins/marketplace.json`. The catalog has one plugin, `mattpocock-skills`, in the `witooh-matt-skills` marketplace. Its local source path `./` resolves from the marketplace repo root, including when Codex checks out the catalog from GitHub.

## Install

Copy the Codex block from [install-block.md](./install-block.md):

```bash
codex plugin marketplace add witooh/matt-skills
codex plugin add mattpocock-skills@witooh-matt-skills
```

Installs this fork's promoted skills as a Codex plugin. Start a new Codex session after installing. To update, run `codex plugin marketplace upgrade witooh-matt-skills`, then re-run the plugin add command.

From a checkout, use `codex plugin marketplace add .` for the first command. Use a Codex CLI that supports `plugin marketplace add` and `plugin add`; this flow was checked on 0.159.3. Pick one install route per agent so a skills.sh copy does not duplicate the plugin's skills.

## Promoted skills only

[OpenAI's manifest reference](https://developers.openai.com/plugins/deploy/submission) now supports `skills` as a directory path or an array of paths. `.codex-plugin/plugin.json` uses the explicit skill-directory array from `.claude-plugin/plugin.json`. Every path points into a real `skills/engineering/<name>` or `skills/productivity/<name>` directory.

Do not use `./skills/`: recursive discovery would include non-promoted buckets and the one-level Oh My Pi aliases. Do not replace the paths with symlinks or copied skills. The bucket directories remain the source of truth, and the existing `agents/openai.yaml` files keep their invocation policies.

Codex namespaces the loaded names, for example `mattpocock-skills:tdd`. The plugin detail view resolves the skill's `SKILL.md` and UI metadata from its bucket directory.

## Maintenance

`npm run sync-codex-plugin` regenerates `.codex-plugin/plugin.json` from the Claude manifest, adds Codex's `interface` metadata, uses this fork's repository URL, and takes the version from `package.json`. `npm run version` runs it after the other manifest syncs.

`npm run check-plugin-version` checks the generated manifest and the marketplace entry. It also compares the Claude list against every skill directory in the two promoted buckets, so a missing skill, duplicate entry, or non-promoted path fails the check. The catalog remains a maintained file rather than generated output.

For a read-only check with the CLI, without registering the marketplace in user configuration:

```bash
codex -c 'marketplaces.witooh-matt-skills.source_type="local"' \
  -c "marketplaces.witooh-matt-skills.source=\"$PWD\"" \
  plugin list --marketplace witooh-matt-skills --available --json
```

## Verification

Checked on Codex CLI 0.159.3:

- `plugin list` with the local marketplace override resolves `mattpocock-skills@witooh-matt-skills`, version 1.2.3, with `AVAILABLE` installation and `ON_USE` authentication policy.
- App-server `plugin/read` resolves exactly the 25 promoted skill names and their original bucket paths. Non-promoted skills are absent.
- `npm run check-plugin-version` passes, including the Codex manifest and catalog check. `claude plugin validate . --strict` still passes.

Rechecked on 2026-10-22 after syncing upstream 1.3.1, using Codex CLI 0.163.0:

- `plugin list` with a temporary, empty `CODEX_HOME` and the local marketplace override resolves version 1.3.1 with `AVAILABLE` installation and `ON_USE` authentication policy.
- `npm run check-plugin-version` passes for all 27 promoted skills.
- `bash kiro-test.sh` passes. A separate temporary Kiro project install includes the graduated `implement-spec`, `pr`, and `retro` skills and excludes retired and non-promoted skills.
- `claude plugin validate . --strict` fails on Claude Code 2.1.308 because the validator warns about root `CLAUDE.md` and the one-level symlink aliases. The aliases remain required for Oh My Pi discovery.

These checks use the working checkout. The GitHub install route picks up these files after they are pushed; it is a repo marketplace rather than a public directory listing.
