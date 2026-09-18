#!/bin/bash
# rust-alc-api の ts-rs TypeScript 型定義を CI artifact から取得し、
# app/types/generated/ にファイル単位で展開する
#
# ★ TODO(#c651-2 マージ後): alc-maintenance crate の ts-bindings artifact が
# 出るようになったら、これで app/types/generated/ を作り、app/types/index.ts
# の手書き型を差し替える (CLAUDE.md 参照)。
#
# Usage:
#   ./scripts/sync-ts-bindings.sh              # latest ts-bindings artifact
#   ./scripts/sync-ts-bindings.sh <sha>        # specific SHA
#
# Prerequisites: gh CLI, access to rust-alc-api repo

set -euo pipefail

REPO="ippoan/rust-alc-api"
DEST="$(cd "$(dirname "$0")/../app/types/generated" && pwd)"
SHA="${1:-}"
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

if [ -n "$SHA" ]; then
  # Specific SHA requested
  ARTIFACT_NAME="ts-bindings-${SHA}"
  echo "Downloading: $ARTIFACT_NAME"
  RUN_ID=$(gh api "repos/$REPO/actions/artifacts?name=$ARTIFACT_NAME" --jq '.artifacts[0].workflow_run.id' 2>/dev/null)
  if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
    echo "ERROR: Artifact '$ARTIFACT_NAME' not found" >&2
    exit 1
  fi
else
  # Find latest ts-bindings artifact (check job runs on PR, not main push)
  ARTIFACT_NAME=$(gh api "repos/$REPO/actions/artifacts?per_page=20" \
    --jq '[.artifacts[] | select(.name | startswith("ts-bindings-")) | select(.expired == false)] | .[0].name' 2>/dev/null)
  if [ -z "$ARTIFACT_NAME" ] || [ "$ARTIFACT_NAME" = "null" ]; then
    echo "ERROR: No ts-bindings artifact found" >&2
    exit 1
  fi
  RUN_ID=$(gh api "repos/$REPO/actions/artifacts?name=$ARTIFACT_NAME" --jq '.artifacts[0].workflow_run.id' 2>/dev/null)
  SHA="${ARTIFACT_NAME#ts-bindings-}"
  echo "Downloading latest: $ARTIFACT_NAME"
fi

gh run download "$RUN_ID" -R "$REPO" -n "$ARTIFACT_NAME" -D "$TMPDIR/bindings"

# Clean existing generated files (keep directory)
find "$DEST" -name "*.ts" -delete 2>/dev/null || true
rm -rf "$DEST/serde_json" 2>/dev/null || true

# Copy per-file .ts files preserving subdirectory structure
find "$TMPDIR/bindings" -name "*.ts" | while IFS= read -r f; do
  relpath="${f#$TMPDIR/bindings/}"
  # Flatten crate paths: crates/alc-core/bindings/Foo.ts -> Foo.ts
  filename=$(basename "$relpath")
  dirpart=$(dirname "$relpath")

  # Handle serde_json subdirectory
  if echo "$dirpart" | grep -q "serde_json"; then
    mkdir -p "$DEST/serde_json"
    cp "$f" "$DEST/serde_json/$filename"
  else
    cp "$f" "$DEST/$filename"
  fi
done

# Regenerate barrel index.ts
{
  find "$DEST" -maxdepth 1 -name "*.ts" ! -name "index.ts" -printf '%f\n' | sort | while IFS= read -r f; do
    name="${f%.ts}"
    echo "export type { $name } from \"./$name\";"
  done
} > "$DEST/index.ts"

COUNT=$(find "$DEST" -name "*.ts" ! -name "index.ts" | wc -l)
echo "Synced $COUNT type files to $DEST (SHA: ${SHA:0:12})"
