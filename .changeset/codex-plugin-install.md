---
"mattpocock-skills": patch
---

Install this fork's promoted skills through a native Codex plugin:

```bash
codex plugin marketplace add witooh/matt-skills
codex plugin add mattpocock-skills@witooh-matt-skills
```

Installs this fork's promoted skills as a Codex plugin. Start a new Codex session after installing. To update, run `codex plugin marketplace upgrade witooh-matt-skills`, then re-run the plugin add command.

The Codex manifest uses the same explicit promoted skill paths as Claude Code. Release versioning regenerates it, and the existing manifest check detects drift in the skill set or marketplace entry.
