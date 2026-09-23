#!/bin/bash
# Copy the promoted skills into ~/.cursor/skills for a Cursor Cloud Agent VM.
#
# Cloud Agents scan ~/.cursor/skills/<name>/SKILL.md. They do not load this
# repo's bucket layout, and the environment install script cannot register a
# /add-plugin marketplace. This script flattens the promoted set onto that path.
#
# Idempotent. Re-running overwrites skills this script owns and removes names
# it previously recorded that left the promoted set. Other skills stay.
#
# From a checkout, including a Cloud Environment install script:
#   git clone --depth 1 https://github.com/witooh/matt-skills.git /tmp/matt-skills
#   /tmp/matt-skills/scripts/install-cursor-cloud.sh
#
#   ./scripts/install-cursor-cloud.sh
#   ./scripts/install-cursor-cloud.sh --root DIR   # default: ~/.cursor

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
PLUGIN_JSON="$REPO/.claude-plugin/plugin.json"
MANIFEST_NAME=".mattpocock-skills"

usage() {
  cat <<'EOF'
Install promoted skills into a Cursor Cloud Agent skills directory.

  ./scripts/install-cursor-cloud.sh
  ./scripts/install-cursor-cloud.sh --root DIR

Default root is ~/.cursor. Skills land in <root>/skills/<name>/.
<root>/.mattpocock-skills records the names this script owns.
EOF
}

cursor_root="${CURSOR_ROOT:-$HOME/.cursor}"
while [ $# -gt 0 ]; do
  case "$1" in
    --root)
      shift
      if [ $# -eq 0 ]; then
        echo "install-cursor-cloud.sh: --root needs a directory" >&2
        exit 1
      fi
      cursor_root="$1"
      shift
      ;;
    -h|--help) usage; exit 0 ;;
    *) echo "install-cursor-cloud.sh: unknown option '$1' (try --help)" >&2; exit 1 ;;
  esac
done

safe_name() {
  case "$1" in
    ""|.*|*/*|*..*) return 1 ;;
  esac
  return 0
}

if [ ! -f "$PLUGIN_JSON" ]; then
  echo "install-cursor-cloud.sh: missing $PLUGIN_JSON" >&2
  exit 1
fi

expected="$(grep -cE '^[[:space:]]*"\./skills/[a-z0-9-]+/[a-z0-9-]+",?[[:space:]]*$' "$PLUGIN_JSON" || true)"
raw="$(grep -c '\./skills/' "$PLUGIN_JSON" || true)"
if [ "$expected" -eq 0 ] || [ "$expected" != "$raw" ]; then
  echo "install-cursor-cloud.sh: $PLUGIN_JSON skills entries must be one \"./skills/<bucket>/<name>\" path per line" >&2
  exit 1
fi

repo_skills="$(cd "$REPO/skills" && pwd -P)"
names=()
srcs=()
while IFS= read -r rel; do
  case "$rel" in
    ./skills/engineering/[a-z0-9-]*|./skills/productivity/[a-z0-9-]*) ;;
    *)
      echo "install-cursor-cloud.sh: refused non-promoted path '$rel'" >&2
      exit 1
      ;;
  esac
  if [ ! -d "$REPO/$rel" ]; then
    echo "install-cursor-cloud.sh: skill directory '$rel' does not exist" >&2
    exit 1
  fi
  real="$(cd "$REPO/$rel" && pwd -P)"
  case "$real" in
    "$repo_skills"/*) ;;
    *)
      echo "install-cursor-cloud.sh: '$rel' resolves outside skills/ ($real)" >&2
      exit 1
      ;;
  esac
  if [ ! -f "$real/SKILL.md" ]; then
    echo "install-cursor-cloud.sh: $rel has no SKILL.md" >&2
    exit 1
  fi
  name="$(basename "$real")"
  safe_name "$name" || {
    echo "install-cursor-cloud.sh: unsafe skill name '$name'" >&2
    exit 1
  }
  name_line="$(grep -m1 '^name:' "$real/SKILL.md" || true)"
  extracted="${name_line#name:}"
  extracted="${extracted#"${extracted%%[![:space:]]*}"}"
  extracted="${extracted#\"}"
  extracted="${extracted%\"}"
  extracted="${extracted#\'}"
  extracted="${extracted%\'}"
  if [ "$extracted" != "$name" ]; then
    echo "install-cursor-cloud.sh: $rel frontmatter name '$extracted' does not match '$name'" >&2
    exit 1
  fi
  seen=" "
  for existing in "${names[@]+"${names[@]}"}"; do
    seen="$seen$existing "
  done
  case "$seen" in
    *" $name "*)
      echo "install-cursor-cloud.sh: duplicate skill name '$name'" >&2
      exit 1
      ;;
  esac
  names+=("$name")
  srcs+=("$real")
done < <(
  grep -E '^[[:space:]]*"\./skills/[a-z0-9-]+/[a-z0-9-]+",?[[:space:]]*$' "$PLUGIN_JSON" \
    | sed -E 's/^[[:space:]]*"//; s/",?[[:space:]]*$//'
)

if [ "${#names[@]}" -ne "$expected" ]; then
  echo "install-cursor-cloud.sh: parsed ${#names[@]} skills, expected $expected" >&2
  exit 1
fi

skill_is_current() {
  local want="$1"
  local current
  for current in "${names[@]}"; do
    if [ "$current" = "$want" ]; then
      return 0
    fi
  done
  return 1
}

remove_owned() {
  local target="$1"
  if [ -L "$target" ]; then
    rm -f "$target"
  elif [ -d "$target" ]; then
    rm -rf "$target"
  elif [ -e "$target" ]; then
    rm -f "$target"
  else
    return 1
  fi
}

echo "mattpocock-skills → Cursor Cloud"
echo "  source: $REPO"
echo "  target: $cursor_root/skills"
echo

mkdir -p "$cursor_root/skills"

manifest="$cursor_root/$MANIFEST_NAME"
owned=()
if [ -f "$manifest" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ""|\#*) continue ;;
    esac
    if safe_name "$line"; then
      owned+=("$line")
    fi
  done < "$manifest"
fi

removed=0
if [ "${#owned[@]}" -gt 0 ]; then
  for name in "${owned[@]}"; do
    safe_name "$name" || continue
    if skill_is_current "$name"; then
      continue
    fi
    if remove_owned "$cursor_root/skills/$name"; then
      removed=$((removed + 1))
    fi
  done
fi

installed=0
for i in "${!names[@]}"; do
  name="${names[$i]}"
  src="${srcs[$i]}"
  target="$cursor_root/skills/$name"
  remove_owned "$target" || true
  cp -R "$src" "$target"
  installed=$((installed + 1))
done

manifest_tmp="$(mktemp)"
printf '%s\n' "${names[@]}" | sort > "$manifest_tmp"
mv "$manifest_tmp" "$manifest"

printf '  %-11s %d\n' "skills:" "$installed"
printf '  %-11s %d\n' "removed:" "$removed"
echo
echo "Done. Cloud Agents scan $cursor_root/skills."
