#!/usr/bin/env bash
# Verify a RepoQuest deployment end to end.
#
#   ./scripts/verify-deployment.sh https://your-deployment.vercel.app [owner/repo] [file-in-that-repo]
#
# Note: this makes ~15 requests. Deployments rate-limit analyses per IP
# (ANALYSIS_RATE_LIMIT_PER_10_MIN, default 60), so avoid running it in a tight loop.
#
# Exits non-zero if any check fails. Only call a deployment "live" after this passes.
set -uo pipefail

BASE="${1:?usage: verify-deployment.sh <base-url> [owner/repo]}"
BASE="${BASE%/}"
REPO="${2:-pallets/flask}"
FILE="${3:-README.md}"       # a text file that exists in $REPO
fail=0

check() { # name, url, expected status, expected content-type substring, optional body substring
  local name="$1" url="$2" want="$3" ctype="$4" body="${5:-}"
  local tmp; tmp="$(mktemp)"
  local got
  got="$(curl -sS -o "$tmp" -w '%{http_code} %{content_type}' --max-time 90 "$url" 2>&1)" || got="ERR $got"
  local code="${got%% *}" type="${got#* }"
  if [[ "$code" != "$want" ]]; then
    echo "FAIL  $name: HTTP $code (expected $want)  $url"; fail=1
  elif [[ -n "$ctype" && "$type" != *"$ctype"* ]]; then
    echo "FAIL  $name: content-type '$type' (expected $ctype)"; fail=1
  elif [[ -n "$body" ]] && ! grep -Eq -- "$body" "$tmp"; then
    echo "FAIL  $name: response does not contain '$body'"; fail=1
  else
    echo "ok    $name ($code)"
  fi
  rm -f "$tmp"
}

echo "Verifying $BASE using $REPO"
check "landing page"        "$BASE/"                                  200 "text/html" "Understand any codebase"
check "explorer"            "$BASE/r/$REPO"                           200 "text/html" 'role="tablist"'
check "guide page"          "$BASE/r/$REPO/guide"                     200 "text/html" "Newcomer"
check "repo social image"   "$BASE/r/$REPO/opengraph-image"           200 "image/png"
check "site social image"   "$BASE/opengraph-image"                   200 "image/png"
check "file preview API"    "$BASE/api/file?owner=${REPO%%/*}&repo=${REPO##*/}&path=$FILE" 200 "application/json" '"content":"'
check "path traversal blocked" "$BASE/api/file?owner=${REPO%%/*}&repo=${REPO##*/}&path=../x" 400 "application/json"
check "missing repo handled" "$BASE/r/${REPO%%/*}/this-repo-should-not-exist-rq-check" 200 "text/html" "find that repository|accessible"
check "no-JS search fallback" "$BASE/go?url=github.com/$REPO"         303 ""
check "robots.txt"          "$BASE/robots.txt"                        200 "text/plain" "Sitemap"
check "sitemap.xml"         "$BASE/sitemap.xml"                       200 "xml"
check "AI status endpoint"  "$BASE/api/explain"                       200 "application/json" '"enabled"'

# Canonical/social URLs must point at the deployment, not localhost.
if curl -sS --max-time 30 "$BASE/" | grep -q 'localhost:3000'; then
  echo "FAIL  metadata: page references localhost:3000. Set NEXT_PUBLIC_SITE_URL and redeploy."; fail=1
else
  echo "ok    metadata URLs do not reference localhost"
fi

# A GitHub token should be configured on public deployments (anonymous = 60 req/h shared by all visitors).
if curl -sS --max-time 60 "$BASE/r/$REPO" | grep -q '(anonymous)'; then
  echo "WARN  GITHUB_TOKEN is not set: the deployment uses GitHub's anonymous 60 requests/hour limit."
fi

if [[ $fail -eq 0 ]]; then echo "All checks passed."; else echo "Some checks failed."; fi
exit $fail
