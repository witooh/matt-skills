#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

project_dir="$tmp_dir/project"
global_home="$tmp_dir/home"
mkdir -p "$project_dir/.kiro/hooks" "$project_dir/.kiro/skills/keep-mine" "$global_home"
printf '%s\n' '{"version":"v1","hooks":[]}' > "$project_dir/.kiro/hooks/user-owned.json"
printf '%s\n' '# mine' > "$project_dir/.kiro/skills/keep-mine/SKILL.md"

user_hook_before="$tmp_dir/user-owned.json.before"
cp "$project_dir/.kiro/hooks/user-owned.json" "$user_hook_before"

"$SCRIPT_DIR/kiro.sh" --project "$project_dir" >/dev/null

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

if [ ! -f "$project_dir/.kiro/skills/tdd/SKILL.md" ]; then
  fail "project install omitted tdd"
fi
if [ ! -f "$project_dir/.kiro/skills/grill-me/SKILL.md" ]; then
  fail "project install omitted grill-me"
fi
if [ -L "$project_dir/.kiro/skills/tdd" ]; then
  fail "project install left tdd as a symlink"
fi
if ! cmp -s "$SCRIPT_DIR/skills/engineering/tdd/SKILL.md" "$project_dir/.kiro/skills/tdd/SKILL.md"; then
  fail "project install did not copy tdd/SKILL.md"
fi
if [ ! -f "$project_dir/.kiro/skills/tdd/agents/openai.yaml" ]; then
  fail "project install dropped a nested skill file"
fi
if [ -e "$project_dir/.kiro/skills/claude-handoff" ]; then
  fail "project install copied in-progress claude-handoff"
fi
if [ -e "$project_dir/.kiro/skills/setup-pre-commit" ]; then
  fail "project install copied misc setup-pre-commit"
fi
if [ -e "$project_dir/.kiro/skills/engineering" ] || [ -e "$project_dir/.kiro/skills/productivity" ]; then
  fail "project install copied a bucket directory"
fi
if [ -e "$project_dir/.kiro/agents" ]; then
  fail "project install created .kiro/agents/"
fi
if ! cmp -s "$user_hook_before" "$project_dir/.kiro/hooks/user-owned.json"; then
  fail "project install mutated a user-owned hook"
fi
if ! cmp -s "$project_dir/.kiro/skills/keep-mine/SKILL.md" <(printf '%s\n' '# mine'); then
  fail "project install removed a user-owned skill"
fi

expected="$(find "$SCRIPT_DIR/skills/engineering" "$SCRIPT_DIR/skills/productivity" -mindepth 2 -maxdepth 2 -name SKILL.md | wc -l | tr -d ' ')"
actual="$(find "$project_dir/.kiro/skills" -mindepth 2 -maxdepth 2 -name SKILL.md | wc -l | tr -d ' ')"
# keep-mine is an extra user-owned skill, so installed count is promoted + 1.
if [ "$actual" -ne "$((expected + 1))" ]; then
  fail "project install count $actual, want $((expected + 1))"
fi

printf '%s\n' 'stale' > "$project_dir/.kiro/skills/tdd/stale.txt"
"$SCRIPT_DIR/kiro.sh" --project "$project_dir" >/dev/null
if [ -e "$project_dir/.kiro/skills/tdd/stale.txt" ]; then
  fail "re-run left a file deleted from the skill directory"
fi

HOME="$global_home" "$SCRIPT_DIR/kiro.sh" --global >/dev/null
if [ ! -f "$global_home/.kiro/skills/tdd/SKILL.md" ]; then
  fail "global install omitted tdd"
fi
if [ -e "$global_home/.kiro/skills/claude-handoff" ]; then
  fail "global install copied in-progress claude-handoff"
fi
if [ -e "$global_home/.kiro/agents" ]; then
  fail "global install created agents/"
fi

"$SCRIPT_DIR/kiro.sh" --help >/dev/null
if "$SCRIPT_DIR/kiro.sh" --nope >/dev/null 2>&1; then
  fail "unknown option exited 0"
fi
if "$SCRIPT_DIR/kiro.sh" --project "$tmp_dir/missing" >/dev/null 2>&1; then
  fail "missing project directory exited 0"
fi

echo "PASS: kiro.sh installs promoted Kiro skills only"
