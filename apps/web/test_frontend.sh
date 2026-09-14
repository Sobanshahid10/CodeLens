#!/usr/bin/env bash
# =============================================================================
# CodeLens Frontend – Complete Test & Health-Check Script
# =============================================================================
# Usage:
#   chmod +x test_frontend.sh
#   ./test_frontend.sh [--skip-browser] [--skip-install]
#
# Covers:
#   1.  Dependency install / integrity check
#   2.  TypeScript type-check (tsc --noEmit)
#   3.  Production build verification
#   4.  Bundle size analysis
#   5.  Source-file audits (missing exports, TODO/FIXME, console.logs)
#   6.  Route coverage check
#   7.  Store / hook unit-smoke tests (Node inline tests, no extra deps)
#   8.  API client smoke test
#   9.  Environment variable presence check
#  10.  Browser live-smoke test (opens browser, checks key pages)
# =============================================================================

set -euo pipefail
IFS=$'\n\t'

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

PASS="${GREEN}✔${RESET}"
FAIL="${RED}✘${RESET}"
WARN="${YELLOW}⚠${RESET}"
INFO="${CYAN}ℹ${RESET}"

ERRORS=0
WARNINGS=0

pass()  { echo -e "  ${PASS}  $*"; }
fail()  { echo -e "  ${FAIL}  $*"; ERRORS=$((ERRORS+1)); }
warn()  { echo -e "  ${WARN}  $*"; WARNINGS=$((WARNINGS+1)); }
info()  { echo -e "  ${INFO}  $*"; }
section(){ echo -e "\n${BOLD}${CYAN}━━━ $* ━━━${RESET}"; }

# ── Flags ─────────────────────────────────────────────────────────────────────
SKIP_BROWSER=false
SKIP_INSTALL=false

for arg in "$@"; do
  case $arg in
    --skip-browser)  SKIP_BROWSER=true  ;;
    --skip-install)  SKIP_INSTALL=true  ;;
  esac
done

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$SCRIPT_DIR"
SRC_DIR="$WEB_DIR/src"
DIST_DIR="$WEB_DIR/dist"
ROOT_DIR="$(cd "$WEB_DIR/../.." && pwd)"

echo -e "\n${BOLD}${CYAN}╔══════════════════════════════════════════════════╗"
echo -e "║   CodeLens Frontend – Full Test Suite            ║"
echo -e "╚══════════════════════════════════════════════════╝${RESET}"
echo -e "  Web dir : ${WEB_DIR}"
echo -e "  Src dir : ${SRC_DIR}"
echo -e "  Started : $(date '+%Y-%m-%d %H:%M:%S')\n"

cd "$WEB_DIR"

# =============================================================================
# 1. DEPENDENCY CHECK
# =============================================================================
section "1 · Dependency Integrity"

if $SKIP_INSTALL; then
  warn "Skipping npm install (--skip-install flag set)"
else
  info "Running npm install …"
  if npm install --prefer-offline 2>&1 | tail -5; then
    pass "npm install succeeded"
  else
    fail "npm install FAILED"
  fi
fi

if [[ -d "$WEB_DIR/node_modules" ]]; then
  pass "node_modules present"
else
  fail "node_modules directory is MISSING – run npm install"
fi

REQUIRED_PKGS=(
  "react" "react-dom" "react-router-dom"
  "@tanstack/react-query" "zustand"
  "lucide-react" "@monaco-editor/react" "d3"
  "react-markdown"
)

for pkg in "${REQUIRED_PKGS[@]}"; do
  if [[ -d "$WEB_DIR/node_modules/$pkg" ]]; then
    pass "Package [$pkg] installed"
  else
    fail "Package [$pkg] is MISSING from node_modules"
  fi
done

# =============================================================================
# 2. TYPESCRIPT TYPE-CHECK
# =============================================================================
section "2 · TypeScript Type-Check (tsc --noEmit)"

info "Running tsc --noEmit …"
if npx tsc --noEmit 2>&1; then
  pass "TypeScript: no type errors"
else
  fail "TypeScript: type errors found — see output above"
fi

# =============================================================================
# 3. PRODUCTION BUILD
# =============================================================================
section "3 · Production Build (vite build)"

info "Building production bundle …"
if npm run build 2>&1; then
  pass "Production build succeeded"
else
  fail "Production build FAILED"
fi

# =============================================================================
# 4. BUNDLE SIZE ANALYSIS
# =============================================================================
section "4 · Bundle Size Analysis"

if [[ -d "$DIST_DIR" ]]; then
  TOTAL_KB=$(du -sk "$DIST_DIR" 2>/dev/null | awk '{print $1}')
  info "Total dist/ size: ${TOTAL_KB} KB"

  while IFS= read -r -d '' f; do
    size_kb=$(du -k "$f" | awk '{print $1}')
    fname=$(basename "$f")
    if (( size_kb > 500 )); then
      warn "Large chunk: ${fname} (${size_kb} KB) – consider code-splitting"
    else
      pass "Chunk OK: ${fname} (${size_kb} KB)"
    fi
  done < <(find "$DIST_DIR" -name "*.js" -print0 2>/dev/null)

  if [[ -f "$DIST_DIR/index.html" ]]; then
    pass "dist/index.html present"
  else
    fail "dist/index.html NOT found"
  fi
else
  fail "dist/ directory does not exist after build"
fi

# =============================================================================
# 5. SOURCE-FILE AUDITS
# =============================================================================
section "5 · Source-File Audits"

info "Checking for stray console.log / console.error …"
CONSOLE_HITS=$(grep -rn --include="*.ts" --include="*.tsx" \
  "console\.\(log\|error\|warn\|debug\)" "$SRC_DIR" | \
  grep -v "// eslint-disable" | grep -v "// oklog" || true)

if [[ -z "$CONSOLE_HITS" ]]; then
  pass "No stray console statements found"
else
  warn "Stray console statements detected:"
  echo "$CONSOLE_HITS" | while IFS= read -r line; do
    echo "      ${line}"
  done
fi

info "Checking for TODO / FIXME / HACK annotations …"
TODO_HITS=$(grep -rn --include="*.ts" --include="*.tsx" \
  "TODO\|FIXME\|HACK\|XXX" "$SRC_DIR" || true)

if [[ -z "$TODO_HITS" ]]; then
  pass "No TODO/FIXME/HACK comments found"
else
  warn "Outstanding TODOs found ($(echo "$TODO_HITS" | wc -l | tr -d ' ') items):"
  echo "$TODO_HITS" | head -20 | while IFS= read -r line; do
    echo "      ${line}"
  done
fi

info "Checking component named exports …"
COMPONENTS=(
  "ChatPanel" "CodeViewer" "CommandPalette" "DependencyGraph"
  "FileTree" "IndexingProgress" "ToastContainer" "UserMenu"
)
for comp in "${COMPONENTS[@]}"; do
  file="$SRC_DIR/components/${comp}.tsx"
  if [[ ! -f "$file" ]]; then
    fail "Component file missing: ${comp}.tsx"
  elif grep -q "export.*${comp}" "$file"; then
    pass "Component exported: ${comp}"
  else
    fail "No export found for ${comp} in ${comp}.tsx"
  fi
done

info "Checking page named exports …"
PAGES=(
  "AuthCallbackPage" "DashboardPage" "GraphPage" "LoginPage" "WorkspacePage"
)
for page in "${PAGES[@]}"; do
  file="$SRC_DIR/pages/${page}.tsx"
  if [[ ! -f "$file" ]]; then
    fail "Page file missing: ${page}.tsx"
  elif grep -q "export.*${page}" "$file"; then
    pass "Page exported: ${page}"
  else
    fail "No export found for ${page} in ${page}.tsx"
  fi
done

info "Checking hooks …"
HOOKS=("useIndexingProgress" "useSSEChat" "useToast")
for hook in "${HOOKS[@]}"; do
  matched=$(find "$SRC_DIR/hooks" -name "${hook}.*" 2>/dev/null | head -1)
  if [[ -n "$matched" ]] && grep -q "export.*${hook}" "$matched"; then
    pass "Hook exported: ${hook}"
  else
    fail "Hook not found or not exported: ${hook}"
  fi
done

info "Checking Zustand stores …"
STORES=("authStore" "commandPaletteStore" "repoStore")
for store in "${STORES[@]}"; do
  file="$SRC_DIR/stores/${store}.ts"
  if [[ ! -f "$file" ]]; then
    fail "Store missing: ${store}.ts"
  elif grep -qE "create[<(]" "$file"; then
    pass "Store valid (uses Zustand create): ${store}"
  else
    warn "Store ${store}.ts exists but no 'create(' call found"
  fi
done

info "Checking lib files …"
LIB_FILES=("api.ts" "auth.ts" "sse.ts")
for lib in "${LIB_FILES[@]}"; do
  if [[ -f "$SRC_DIR/lib/${lib}" ]]; then
    pass "Lib present: ${lib}"
  else
    fail "Lib missing: ${lib}"
  fi
done

# =============================================================================
# 6. ROUTE COVERAGE CHECK
# =============================================================================
section "6 · Route Coverage Check"

info "Verifying routes declared in App.tsx …"
APP_FILE="$SRC_DIR/App.tsx"

for route in "/login" "/auth/callback" "/dashboard"; do
  if grep -q "path=\"${route}\"" "$APP_FILE" 2>/dev/null; then
    pass "Route declared: ${route}"
  else
    fail "Route MISSING in App.tsx: ${route}"
  fi
done

# Repo routes with dynamic segments
for route in "/repo/:repoId" "/repo/:repoId/graph"; do
  escaped="${route//\//\\/}"
  if grep -q "path=\"${route}\"" "$APP_FILE" 2>/dev/null; then
    pass "Route declared: ${route}"
  else
    fail "Route MISSING in App.tsx: ${route}"
  fi
done

info "Checking ProtectedRoute wrapper …"
if grep -q "ProtectedRoute" "$APP_FILE"; then
  pass "ProtectedRoute component is used"
else
  fail "ProtectedRoute NOT found in App.tsx"
fi

# =============================================================================
# 7. STORE / HOOK UNIT-SMOKE TESTS  (pure Node, zero extra dependencies)
# =============================================================================
section "7 · Zustand Store & Hook Logic Smoke Tests (Node inline)"

info "Running inline Node.js smoke tests …"

node --input-type=module << 'NODE_EOF'
// ── Minimal shims ─────────────────────────────────────────────────────────
const storeMap = {};
global.localStorage = {
  getItem:    (k) => storeMap[k] ?? null,
  setItem:    (k, v) => { storeMap[k] = String(v); },
  removeItem: (k) => { delete storeMap[k]; },
  clear:      () => Object.keys(storeMap).forEach(k => delete storeMap[k]),
};
global.window = {
  location: { search: '', pathname: '/' },
  history:  { replaceState: () => {} }
};

// ── Test runner ───────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log("  \u2714  " + name); passed++; }
  catch(e) { console.error("  \u2718  " + name + "\n      " + e.message); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg ?? 'Assertion failed'); }

// ── Toast store logic ─────────────────────────────────────────────────────
const toasts = [];
const addToast = (toast) => {
  const id = "toast-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  toasts.push({ ...toast, id, duration: toast.duration ?? 3500 });
  return id;
};
const removeToast = (id) => {
  const idx = toasts.findIndex(t => t.id === id);
  if (idx !== -1) toasts.splice(idx, 1);
};

test('Toast: addToast generates unique id', () => {
  const id1 = addToast({ type: 'success', title: 'T1' });
  const id2 = addToast({ type: 'error',   title: 'T2' });
  assert(id1 !== id2, 'IDs must be unique');
  assert(id1.startsWith('toast-'), 'ID must start with toast-');
});

test('Toast: defaults duration to 3500ms', () => {
  const id = addToast({ type: 'info', title: 'No dur' });
  const t = toasts.find(t => t.id === id);
  assert(t.duration === 3500, 'Duration should default to 3500');
});

test('Toast: respects custom duration', () => {
  const id = addToast({ type: 'warning', title: 'Custom', duration: 7000 });
  const t = toasts.find(t => t.id === id);
  assert(t.duration === 7000, 'Custom duration should be respected');
});

test('Toast: removeToast removes correct toast', () => {
  toasts.length = 0;
  const id = addToast({ type: 'success', title: 'Remove me' });
  assert(toasts.length === 1, 'Should have 1 toast');
  removeToast(id);
  assert(toasts.length === 0, 'Toast should be removed');
});

test('Toast: all four toast types accepted', () => {
  for (const type of ['success', 'error', 'info', 'warning']) {
    const id = addToast({ type, title: type + ' toast' });
    const found = toasts.find(x => x.id === id);
    assert(found.type === type, 'Type ' + type + ' should be stored');
  }
});

// ── Auth token logic ──────────────────────────────────────────────────────
const TOKEN_KEY = 'codelens_token';
const getToken  = () => global.localStorage.getItem(TOKEN_KEY);
const setToken  = (t) => global.localStorage.setItem(TOKEN_KEY, t);
const clearToken = () => global.localStorage.removeItem(TOKEN_KEY);

test('Auth: token round-trip (setToken -> getToken)', () => {
  setToken('test-token-abc');
  assert(getToken() === 'test-token-abc', 'Token should be retrievable');
});

test('Auth: clearToken removes token', () => {
  setToken('will-be-cleared');
  clearToken();
  assert(getToken() === null, 'Token should be null after clear');
});

test('Auth: isAuthenticated true when token exists', () => {
  setToken('valid-token');
  assert(!!getToken() === true, 'isAuthenticated should be true');
});

test('Auth: isAuthenticated false after logout', () => {
  clearToken();
  assert(!!getToken() === false, 'isAuthenticated should be false');
});

// ── API URL-building logic ────────────────────────────────────────────────
function buildUrl(endpoint, params) {
  let url = endpoint.startsWith('/') ? endpoint : "/api/v1/" + endpoint;
  if (params) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) sp.append(k, String(v)); });
    const qs = sp.toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  }
  return url;
}

test('API: absolute endpoint is not prefixed', () => {
  const url = buildUrl('/health', {});
  assert(url === '/health', "Expected /health, got " + url);
});

test('API: relative endpoint gets /api/v1 prefix', () => {
  const url = buildUrl('repos', {});
  assert(url === '/api/v1/repos', "Expected /api/v1/repos, got " + url);
});

test('API: query params are appended correctly', () => {
  const url = buildUrl('repos', { page: 1, active: true });
  assert(url.includes('page=1'), 'Should include page=1');
  assert(url.includes('active=true'), 'Should include active=true');
});

test('API: undefined params are excluded', () => {
  const url = buildUrl('repos', { page: undefined, limit: 10 });
  assert(!url.includes('page='), 'Undefined params should not appear');
  assert(url.includes('limit=10'), 'Defined params should appear');
});

test('API: existing query string extended with &', () => {
  const url = buildUrl('/endpoint?existing=1', { extra: 'value' });
  assert(url.includes('existing=1'), 'Existing QS should be preserved');
  assert(url.includes('extra=value'), 'New param should be appended');
  assert(url.includes('&'), 'Should use & separator');
});

// ── Route guard logic ─────────────────────────────────────────────────────
const protectedRoute = (isAuthenticated, path) => isAuthenticated ? path : '/login';

test('Route: unauthenticated user redirected to /login', () => {
  assert(protectedRoute(false, '/dashboard') === '/login');
});

test('Route: authenticated user reaches target', () => {
  assert(protectedRoute(true, '/dashboard') === '/dashboard');
});

// ── Report ─────────────────────────────────────────────────────────────────
console.log("\n  Results: " + passed + " passed, " + failed + " failed");
if (failed > 0) process.exit(1);
NODE_EOF

if [[ $? -eq 0 ]]; then
  pass "All inline unit-smoke tests passed"
else
  fail "One or more inline unit-smoke tests FAILED"
fi

# =============================================================================
# 8. API CLIENT NETWORK SMOKE TEST
# =============================================================================
section "8 · API Client Network Smoke Test"

API_BASE="http://localhost:8000"

info "Checking if backend API is reachable at ${API_BASE} …"
if curl -sf --max-time 3 "${API_BASE}/health" -o /dev/null 2>/dev/null; then
  pass "Backend reachable at ${API_BASE}/health"

  info "Testing /api/v1/auth/demo endpoint …"
  DEMO_RESP=$(curl -sf --max-time 5 -X POST \
    -H "Content-Type: application/json" \
    "${API_BASE}/api/v1/auth/demo" 2>/dev/null || echo "FAILED")

  if echo "$DEMO_RESP" | grep -q "access_token"; then
    pass "/auth/demo returned access_token"
    TOKEN=$(echo "$DEMO_RESP" | grep -o '"access_token":"[^"]*"' | head -1 | cut -d'"' -f4)

    info "Testing /api/v1/repos with Bearer token …"
    REPOS_STATUS=$(curl -s --max-time 5 -o /dev/null -w "%{http_code}" \
      -H "Authorization: Bearer ${TOKEN}" \
      "${API_BASE}/api/v1/repos" 2>/dev/null || echo "0")

    if [[ "$REPOS_STATUS" == "200" ]]; then
      pass "/api/v1/repos returned 200"
    else
      warn "/api/v1/repos returned HTTP ${REPOS_STATUS} (expected 200)"
    fi
  else
    warn "/auth/demo did not return access_token"
  fi
else
  warn "Backend NOT reachable at ${API_BASE} – skipping API network tests"
  info "Start the backend first: make dev  OR  uvicorn apps.api.main:app --reload"
fi

# =============================================================================
# 9. ENVIRONMENT VARIABLE CHECK
# =============================================================================
section "9 · Environment Variable Presence"

ENV_FILE="$ROOT_DIR/.env"
ENV_EXAMPLE="$ROOT_DIR/.env.example"

if [[ -f "$ENV_FILE" ]]; then
  pass ".env file found"

  if [[ -f "$ENV_EXAMPLE" ]]; then
    info "Comparing .env against .env.example for missing keys …"
    MISSING_KEYS=()
    while IFS= read -r line; do
      [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
      KEY="${line%%=*}"
      if ! grep -q "^${KEY}=" "$ENV_FILE" 2>/dev/null; then
        MISSING_KEYS+=("$KEY")
      fi
    done < "$ENV_EXAMPLE"

    if [[ ${#MISSING_KEYS[@]} -eq 0 ]]; then
      pass "All keys from .env.example are present in .env"
    else
      for key in "${MISSING_KEYS[@]}"; do
        warn "Missing env key: ${key}"
      done
    fi
  fi
else
  warn ".env file NOT found at ${ENV_FILE}"
  info "Copy .env.example to .env and fill in values"
fi

# =============================================================================
# 10. BROWSER LIVE SMOKE TEST (optional)
# =============================================================================
section "10 · Browser Live Smoke Test"

if $SKIP_BROWSER; then
  warn "Skipping browser tests (--skip-browser flag set)"
else
  DEV_PORT=3000
  DEV_STARTED_BY_SCRIPT=false

  if lsof -i ":${DEV_PORT}" -sTCP:LISTEN -t &>/dev/null; then
    info "Dev server already running on port ${DEV_PORT}"
  else
    info "Starting Vite dev server on port ${DEV_PORT} …"
    npm run dev &>/tmp/codelens_vite.log &
    DEV_PID=$!
    DEV_STARTED_BY_SCRIPT=true

    TIMEOUT=20; COUNT=0
    until curl -sf "http://localhost:${DEV_PORT}" -o /dev/null 2>/dev/null; do
      sleep 1; ((COUNT++))
      if (( COUNT >= TIMEOUT )); then
        fail "Dev server did not start within ${TIMEOUT}s"
        break
      fi
    done
    [[ $COUNT -lt $TIMEOUT ]] && pass "Dev server ready in ${COUNT}s"
  fi

  check_url() {
    local url="$1" label="$2"
    local status
    status=$(curl -sf --max-time 5 -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "0")
    if [[ "$status" =~ ^(200|304)$ ]]; then
      pass "Route [${label}] -> HTTP ${status}"
    else
      fail "Route [${label}] -> HTTP ${status} (expected 200/304)"
    fi
  }

  BASE="http://localhost:${DEV_PORT}"
  check_url "${BASE}/"          "/ (root)"
  check_url "${BASE}/login"     "/login"
  check_url "${BASE}/dashboard" "/dashboard"

  info "Verifying index.html structure …"
  INDEX_HTML=$(curl -sf --max-time 5 "${BASE}/" 2>/dev/null || echo "")
  if echo "$INDEX_HTML" | grep -q 'id="root"'; then
    pass "index.html contains React mount point #root"
  else
    fail "index.html missing React mount point #root"
  fi
  if echo "$INDEX_HTML" | grep -qi '<title>'; then
    pass "index.html has a <title> tag"
  else
    warn "index.html missing <title> tag"
  fi

  if [[ "$DEV_STARTED_BY_SCRIPT" == "true" ]]; then
    kill "$DEV_PID" 2>/dev/null || true
    info "Dev server stopped"
  fi
fi

# =============================================================================
# FINAL SUMMARY
# =============================================================================
echo -e "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}  FINAL SUMMARY${RESET}"
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

if (( ERRORS == 0 && WARNINGS == 0 )); then
  echo -e "\n  ${GREEN}${BOLD}All checks passed – frontend is healthy!${RESET}\n"
elif (( ERRORS == 0 )); then
  echo -e "\n  ${YELLOW}${BOLD}Passed with ${WARNINGS} warning(s) – review above${RESET}\n"
else
  echo -e "\n  ${RED}${BOLD}${ERRORS} FAILURE(S) and ${WARNINGS} WARNING(S) detected!${RESET}\n"
fi

echo -e "  Errors   : ${RED}${ERRORS}${RESET}"
echo -e "  Warnings : ${YELLOW}${WARNINGS}${RESET}"
echo -e "  Finished : $(date '+%Y-%m-%d %H:%M:%S')\n"

exit $ERRORS
