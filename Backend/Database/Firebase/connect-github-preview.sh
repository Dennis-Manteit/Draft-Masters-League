#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID=draft-masters-league
REPO=Dennis-Manteit/Draft-Masters-League
ACCOUNT_ID=dml-github-preview
ACCOUNT_EMAIL="${ACCOUNT_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
SECRET_NAME=FIREBASE_SERVICE_ACCOUNT_DRAFT_MASTERS_LEAGUE

for command_name in gcloud gh; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing $command_name in Cloud Shell. No deploy account was created." >&2
    exit 1
  fi
done

echo "Sign in to GitHub with the account that administers $REPO."
echo "GitHub CLI uses a device code; it does not redirect to localhost:9005."
if ! gh auth status >/dev/null 2>&1; then
  gh auth login --hostname github.com --git-protocol https --web --scopes repo
fi
gh repo view "$REPO" --json nameWithOwner --jq .nameWithOwner >/dev/null

gcloud config set project "$PROJECT_ID" >/dev/null
if ! gcloud iam service-accounts describe "$ACCOUNT_EMAIL" --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$ACCOUNT_ID" \
    --project "$PROJECT_ID" \
    --display-name "DML GitHub preview deploy"
fi

for role_name in roles/firebasehosting.admin roles/serviceusage.apiKeysViewer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member "serviceAccount:$ACCOUNT_EMAIL" \
    --role "$role_name" \
    --quiet >/dev/null
done

private_dir="$(mktemp -d)"
chmod 700 "$private_dir"
trap 'rm -rf -- "$private_dir"' EXIT
umask 077
gcloud iam service-accounts keys create "$private_dir/key.json" \
  --iam-account "$ACCOUNT_EMAIL" \
  --project "$PROJECT_ID" >/dev/null
gh secret set "$SECRET_NAME" --repo "$REPO" --app actions < "$private_dir/key.json"
echo "Connection secret saved to GitHub Actions for $REPO."
echo "The temporary key file will now be deleted. Do not print or share the key."
