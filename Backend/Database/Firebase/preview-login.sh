#!/usr/bin/env bash
set -euo pipefail

# Firebase CLI requires Hosting files to sit inside its project directory.
# Stage a clean temporary project; leave the repository layout unchanged.
config_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source_dir="$(cd "$config_dir/../../../web" && pwd)"
stage_dir="$(mktemp -d)"
trap 'rm -rf "$stage_dir"' EXIT

cp "$config_dir/.firebaserc" "$config_dir/firebase.json" "$config_dir/database.rules.json" "$stage_dir/"
cp -R "$source_dir" "$stage_dir/web"
cd "$stage_dir"
npx --yes firebase-tools hosting:channel:deploy dml-login --expires 1d --project draft-masters-league
