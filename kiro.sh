#!/usr/bin/env bash
# matt-skills → Kiro installer. Copies the promoted skills into a Kiro config directory.
# Run with --help for the layout.

set -euo pipefail
shopt -s nullglob

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

usage() {
  cat <<'EOF'
matt-skills → Kiro installer

Copies the promoted skills into a Kiro configuration directory.

Kiro layout (https://kiro.dev/docs/skills/):
  ~/.kiro/skills/     user-level skills
  .kiro/skills/       workspace skills (these win when names collide)

Usage:
  ./kiro.sh                  install to global   ~/.kiro
  ./kiro.sh --global         install to global   ~/.kiro   (explicit)
  ./kiro.sh --project        install to project  ./.kiro
  ./kiro.sh --project DIR    install to project  DIR/.kiro
  ./kiro.sh -h | --help      show this help

Re-running overwrites only the promoted skill directories. Other Kiro
content is left intact.
EOF
}

scope="global"
project_dir="."
while [ $# -gt 0 ]; do
  case "$1" in
    --global) scope="global"; shift ;;
    --project)
      scope="project"; shift
      if [ $# -gt 0 ] && [ "${1#-}" = "$1" ]; then project_dir="$1"; shift; fi
      ;;
    -h|--help) usage; exit 0 ;;
    *) echo "kiro.sh: unknown option '$1' (try --help)" >&2; exit 1 ;;
  esac
done

if [ "$scope" = "global" ]; then
  kiro_root="$HOME/.kiro"
else
  if [ ! -d "$project_dir" ]; then
    echo "kiro.sh: project directory '$project_dir' does not exist" >&2
    exit 1
  fi
  kiro_root="$(cd "$project_dir" && pwd)/.kiro"
fi

echo "matt-skills → Kiro"
echo "  source: $SCRIPT_DIR"
echo "  target: $kiro_root ($scope)"
echo

mkdir -p "$kiro_root/skills"
skills=0
seen="$(mktemp)"
trap 'rm -f "$seen"' EXIT

install_one() {
  local dir="$1"
  local name
  name="$(basename "$dir")"
  if grep -qx "$name" "$seen"; then
    echo "kiro.sh: duplicate skill name '$name'" >&2
    exit 1
  fi
  printf '%s\n' "$name" >> "$seen"
  rm -rf "$kiro_root/skills/$name"
  cp -R "$dir" "$kiro_root/skills/$name"
  skills=$((skills + 1))
}

# Promoted buckets only. Copy the real directories, not the one-level
# skills/<name> omp symlinks: those aliases would dangle outside this repo.
for bucket in engineering productivity; do
  for dir in "$SCRIPT_DIR"/skills/"$bucket"/*/; do
    [ -f "${dir}SKILL.md" ] || continue
    if [ -L "${dir%/}" ]; then
      echo "kiro.sh: refusing to copy symlink '${dir%/}'" >&2
      exit 1
    fi
    install_one "${dir%/}"
  done
done

if [ "$skills" -eq 0 ]; then
  echo "kiro.sh: no promoted skills found" >&2
  exit 1
fi

printf '  %-11s %d → %s/  %s\n' "skills:" "$skills" "$kiro_root/skills" "(promoted set)"
echo
echo "Done. Skills live in .kiro/skills/<name>/ as Agent Skills."
