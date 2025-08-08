#!/usr/bin/env bash
set -euo pipefail

# Delete files whose names include ":Zone.Identifier" or have extensions containing "Zone"/"zone".
# Works safely across Linux/macOS. Ignores node_modules and .git directories.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Build list using find with -print0 for safety
mapfile -d '' CANDIDATES < <( \
  find . \
    -path "./.git" -prune -o \
    -path "./node_modules" -prune -o \
    -type f \( \
      -name "*:Zone.Identifier" -o \
      -regex ".*\..*[Zz]one.*" \
    \) -print0 \
)

if [[ ${#CANDIDATES[@]} -eq 0 ]]; then
  echo "No Zone-related files found."
  exit 0
fi

printf "Will delete %d files:\n" "${#CANDIDATES[@]}"
for f in "${CANDIDATES[@]}"; do
  printf "  %s\n" "$f"
  rm -f -- "$f"
done

echo "Done."
