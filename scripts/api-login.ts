#!/usr/bin/env bun
/**
 * API Login CLI - Authentication Token Generator
 *
 * Authenticates against the project API and stores the token for:
 *   1. Playwright tests        → .auth/api-state.json (untouched)
 *   2. Agentic curl API-testing maneuver → .auth/tokens.env (sourceable
 *      `export API_TOKEN_<ROLE>_<ENV>='<token>'`) + .auth/tokens.json
 *      (metadata for freshness checks). See
 *      agentic-qa-core/references/api-testing-doctrine.md — the OpenAPI MCP
 *      is schema-read-only; no credential is ever injected into any MCP, so
 *      no restart is required after login.
 *
 * Usage:
 *   bun run api:login                 # Uses TEST_ENV from .env (default: local)
 *   bun run api:login local           # Authenticate against local environment
 *   bun run api:login staging         # Authenticate against staging environment
 *   bun run api:login --help          # Show help
 *
 * Environment URLs, credentials, and auth endpoints are sourced from
 * config/variables.ts (single source of truth). See that file to add
 * new environments or change URLs.
 */

import type { ApiState } from '@data/types';

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// ============================================
// Logging (must be defined early for validation errors)
// ============================================

const PREFIX = '[api-login]';

function log(msg: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') {
  const icons = { info: '\u2139', success: '\u2713', warn: '\u26A0', error: '\u2717' };
  const colors = { info: '\x1B[36m', success: '\x1B[32m', warn: '\x1B[33m', error: '\x1B[31m' };
  console.log(`${colors[type]}${icons[type]}\x1B[0m ${PREFIX} ${msg}`);
}

// ============================================
// CLI Argument Parsing (BEFORE config import)
// ============================================

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Resolve a `--flag value` or `--flag=value` option from argv.
function flagValue(name: string): string | undefined {
  const eq = args.find(a => a.startsWith(`--${name}=`));
  if (eq) { return eq.slice(name.length + 3); }
  const idx = args.indexOf(`--${name}`);
  const next = args[idx + 1];
  if (idx !== -1 && next && !next.startsWith('-')) { return next; }
  return undefined;
}

const validEnvs = ['local', 'staging']; // Must match Environment type in config/variables.ts
const validMethods = ['signin', 'pat']; // signin = signup-fallback flow; pat = use existing PAT
const validRoles = ['user', 'viewer', 'member', 'admin', 'owner']; // Must match UserRole

// Positional arg = environment (first token that is not a flag), kept for back-compat.
const envArg = flagValue('env') ?? args.find(a => !a.startsWith('-'));
const method = flagValue('method') ?? 'signin';
const role = flagValue('role') ?? 'user';

if (!validMethods.includes(method)) {
  log(`Unknown method: "${method}"`, 'error');
  log(`Available methods: ${validMethods.join(', ')}`, 'info');
  process.exit(1);
}
if (!validRoles.includes(role)) {
  log(`Unknown role: "${role}"`, 'error');
  log(`Available roles: ${validRoles.join(', ')}`, 'info');
  process.exit(1);
}

// Validate and override TEST_ENV BEFORE importing config,
// because config/variables.ts reads TEST_ENV at evaluation time.
if (envArg) {
  if (!validEnvs.includes(envArg)) {
    log(`Unknown environment: "${envArg}"`, 'error');
    log(`Available environments: ${validEnvs.join(', ')}`, 'info');
    process.exit(1);
  }
  process.env.TEST_ENV = envArg;
}

// Dynamic import: config/variables.ts reads TEST_ENV at evaluation time,
// so we must set it above BEFORE this import runs.
const { config, env, resolveTestUser } = await import('@variables');

// Credentials for the requested role + environment (single source: config/variables.ts).
const testUser = resolveTestUser(role as Parameters<typeof resolveTestUser>[0]);

// ============================================
// Constants
// ============================================

const PROJECT_ROOT = resolve(import.meta.dir, '..');
const AUTH_DIR = resolve(PROJECT_ROOT, '.auth');
const TOKENS_ENV_FILE = resolve(AUTH_DIR, 'tokens.env');
const TOKENS_JSON_FILE = resolve(AUTH_DIR, 'tokens.json');
const KEY_PREFIX = `${env.current.toUpperCase()}_${role.toUpperCase()}`;

// ╔══════════════════════════════════════════════════════════════════╗
// ║  PROJECT-SPECIFIC AUTHENTICATION — Bunkai TMS                   ║
// ║  Stack: Next.js 15 + Supabase Auth + custom PAT layer.          ║
// ║  Flow (per /qa testability guide + Epic BK-29):                 ║
// ║    1. POST /api/v1/auth/signin { email, password }              ║
// ║       → { user, session, pat: { token: "bk_pat_..." } }         ║
// ║    2. If signin returns 401 → POST /api/v1/auth/signup with     ║
// ║       same credentials, then retry signin. Magic-link UI users  ║
// ║       have no password — signup forces a password-bearing user. ║
// ║    3. Token consumed by MCP servers = the PAT (Bearer-          ║
// ║       compatible, long-lived, scoped). NOT the Supabase JWT.    ║
// ╚══════════════════════════════════════════════════════════════════╝

const SIGNUP_PATH = '/auth/signup';
const DEFAULT_PAT_SCOPES = ['atc:read', 'atc:write', 'run:execute', 'workspace:admin'];

function buildAuthPayload(email: string, password: string): Record<string, unknown> {
  return { email, password };
}

function buildSignupPayload(email: string, password: string): Record<string, unknown> {
  return {
    email,
    password,
    pat_name: `api-login-${env.current}-${new Date().toISOString().slice(0, 10)}`,
    pat_scopes: DEFAULT_PAT_SCOPES,
  };
}

/**
 * Extract token fields from the Bunkai auth response.
 *
 * Response shape (signin + signup both):
 *   {
 *     user: { id, email },
 *     session: { access_token, refresh_token, expires_at },
 *     pat: { token, id, scopes, expires_at }   <- token shown ONCE
 *   }
 *
 * We persist the PAT (bk_pat_<prefix>.<secret>) — it is the canonical
 * Bearer credential for headless agents and CLIs. The Supabase JWT in
 * session.access_token is short-lived and cookie-flow oriented.
 */
function extractTokenFromResponse(body: Record<string, unknown>): {
  accessToken: string
  tokenType: string
  expiresIn: number
  refreshToken: string | null
} {
  const pat = (body.pat ?? {}) as Record<string, unknown>;
  const session = (body.session ?? {}) as Record<string, unknown>;
  const expiresAt = pat.expires_at ?? session.expires_at;
  const expiresIn = typeof expiresAt === 'number'
    ? Math.max(0, expiresAt - Math.floor(Date.now() / 1000))
    : 86400 * 30; // PATs default to no expiry → cache hint of 30 days
  return {
    accessToken: String(pat.token ?? ''),
    tokenType: 'Bearer',
    expiresIn,
    refreshToken: session.refresh_token ? String(session.refresh_token) : null,
  };
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  END OF PROJECT-SPECIFIC CONFIGURATION                          ║
// ╚══════════════════════════════════════════════════════════════════╝

// ============================================
// Authentication
// ============================================

async function postJson(url: string, payload: Record<string, unknown>): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Accept': '*/*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

function buildApiState(responseBody: Record<string, unknown>): ApiState | null {
  const tokenData = extractTokenFromResponse(responseBody);
  if (!tokenData.accessToken) {
    log('Auth response did not contain a PAT token (body.pat.token).', 'error');
    log(`Response keys: ${Object.keys(responseBody).join(', ')}`, 'error');
    return null;
  }
  return {
    token: tokenData.accessToken,
    tokenType: tokenData.tokenType,
    expiresIn: tokenData.expiresIn,
    refreshToken: tokenData.refreshToken,
    source: 'api-login',
    createdAt: new Date().toISOString(),
  };
}

async function authenticate(): Promise<ApiState | null> {
  const signinUrl = `${config.apiUrl}${config.auth.loginEndpoint}`;
  const signupUrl = `${config.apiUrl}${SIGNUP_PATH}`;
  const { email, password } = testUser;
  const keyPrefix = `${env.current.toUpperCase()}_${role.toUpperCase()}`;

  if (!email || !password) {
    log('Missing credentials in .env file:', 'error');
    if (!email) { log(`  - ${keyPrefix}_EMAIL is not set`, 'error'); }
    if (!password) { log(`  - ${keyPrefix}_PASSWORD is not set`, 'error'); }
    log('Set these in your .env file and try again.', 'info');
    return null;
  }

  log(`Signing in at ${signinUrl}...`);

  try {
    const signinRes = await postJson(signinUrl, buildAuthPayload(email, password));

    if (signinRes.ok) {
      const body = (await signinRes.json()) as Record<string, unknown>;
      return buildApiState(body);
    }

    // 401 = user does not exist OR magic-link-only user (no password set).
    // Try to provision via signup, which also returns a session + fresh PAT.
    if (signinRes.status === 401) {
      log(`Signin returned 401 — provisioning QA user via ${signupUrl}...`, 'warn');
      const signupRes = await postJson(signupUrl, buildSignupPayload(email, password));

      if (signupRes.ok) {
        log('Signup succeeded — using PAT from signup response.', 'success');
        const body = (await signupRes.json()) as Record<string, unknown>;
        return buildApiState(body);
      }

      // 409 = user already exists with a different password → cannot recover blindly.
      if (signupRes.status === 409) {
        const body = await signupRes.text();
        log('Signup returned 409 (user exists) but signin failed — password in .env likely wrong.', 'error');
        log(`Response: ${body}`, 'error');
        log('Rotate the password manually or update LOCAL_USER_PASSWORD / STAGING_USER_PASSWORD in .env.', 'info');
        return null;
      }

      const body = await signupRes.text();
      log(`Signup failed with status ${signupRes.status}`, 'error');
      log(`Response: ${body}`, 'error');
      return null;
    }

    const body = await signinRes.text();
    log(`Signin failed with status ${signinRes.status}`, 'error');
    log(`Response: ${body}`, 'error');
    return null;
  }
  catch (error) {
    log('Connection failed. Is the server running?', 'error');
    log(`  ${String(error)}`, 'error');
    return null;
  }
}

/**
 * Method 2 — authenticate with an existing Personal Access Token.
 *
 * Reads {ENV}_{ROLE}_API_TOKEN from .env, validates it against GET /me with a
 * Bearer header, and persists it as-is. No signin/signup is performed — the PAT
 * is already the canonical credential. Use this when a long-lived token was
 * minted out-of-band (e.g. from the Bunkai UI) and you just want to wire it in.
 */
async function authenticateWithPat(): Promise<ApiState | null> {
  const { apiToken } = testUser;
  const keyPrefix = `${env.current.toUpperCase()}_${role.toUpperCase()}`;

  if (!apiToken) {
    log('Missing PAT in .env file:', 'error');
    log(`  - ${keyPrefix}_API_TOKEN is not set`, 'error');
    log('Set it in your .env file and try again, or use --method=signin.', 'info');
    return null;
  }

  const meUrl = `${config.apiUrl}${config.auth.meEndpoint}`;
  log(`Validating PAT against ${meUrl}...`);

  try {
    const res = await fetch(meUrl, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${apiToken}` },
    });

    if (!res.ok) {
      const body = await res.text();
      log(`PAT validation failed with status ${res.status}`, 'error');
      log(`Response: ${body}`, 'error');
      log(`The token in ${keyPrefix}_API_TOKEN is invalid, expired, or revoked.`, 'info');
      return null;
    }

    log('PAT is valid.', 'success');
    return {
      token: apiToken,
      tokenType: 'Bearer',
      expiresIn: config.auth.tokenLifetimeSeconds,
      refreshToken: null,
      source: 'api-login',
      createdAt: new Date().toISOString(),
    };
  }
  catch (error) {
    log('Connection failed. Is the server running?', 'error');
    log(`  ${String(error)}`, 'error');
    return null;
  }
}

// ============================================
// Token Storage: api-state.json
// ============================================

function saveApiState(apiState: ApiState): void {
  const apiStatePath = config.auth.apiStatePath;
  mkdirSync(dirname(apiStatePath), { recursive: true });
  writeFileSync(apiStatePath, JSON.stringify(apiState, null, 2));
  log(`Token saved to ${apiStatePath}`, 'success');
}

// ============================================
// Token Storage: .auth/tokens.env + .auth/tokens.json
// ============================================
//
// Per agentic-qa-core/references/api-testing-doctrine.md: the OpenAPI MCP is
// schema-read-only and NEVER receives a credential. Authenticated requests at
// the agentic-testing level run through curl, sourcing the token minted here.
// Nothing is written to .env and no MCP config is touched — so no restart.

interface TokenMetadata {
  token: string
  tokenType: string
  expiresIn: number
  createdAt: string
}

/** Write via a tmp file + renameSync so a crash mid-write never leaves a truncated file. */
function writeFileAtomic(targetPath: string, content: string): void {
  const tmpFile = `${targetPath}.tmp`;
  writeFileSync(tmpFile, content);
  renameSync(tmpFile, targetPath);
}

/** Single-quote a value for a POSIX-sourceable `export KEY='<value>'` line. */
function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, '\'\\\'\'')}'`;
}

/** Upsert `export API_TOKEN_<keyPrefix>='<token>'` in .auth/tokens.env, preserving other roles/envs. */
function saveTokensEnv(keyPrefix: string, token: string): void {
  const varName = `API_TOKEN_${keyPrefix}`;
  mkdirSync(AUTH_DIR, { recursive: true });
  const raw = existsSync(TOKENS_ENV_FILE) ? readFileSync(TOKENS_ENV_FILE, 'utf-8') : '';
  const lines = raw.split('\n').filter(line => line.trim() !== '');
  const linePattern = new RegExp(`^export ${varName}=`);
  const replacement = `export ${varName}=${shellSingleQuote(token)}`;

  let replaced = false;
  const updated = lines.map((line) => {
    if (linePattern.test(line)) {
      replaced = true;
      return replacement;
    }
    return line;
  });
  if (!replaced) {
    updated.push(replacement);
  }

  writeFileAtomic(TOKENS_ENV_FILE, `${updated.join('\n')}\n`);
  log(`Token saved to .auth/tokens.env (export ${varName})`, 'success');
}

/** Upsert metadata keyed by `<keyPrefix>` in .auth/tokens.json, preserving other roles/envs. */
function saveTokensJson(keyPrefix: string, apiState: ApiState): void {
  mkdirSync(AUTH_DIR, { recursive: true });
  let data: Record<string, TokenMetadata> = {};
  if (existsSync(TOKENS_JSON_FILE)) {
    try {
      data = JSON.parse(readFileSync(TOKENS_JSON_FILE, 'utf-8')) as Record<string, TokenMetadata>;
    }
    catch {
      log('.auth/tokens.json is corrupt/unreadable — resetting it (other roles/envs lost).', 'warn');
      data = {};
    }
  }
  data[keyPrefix] = {
    token: apiState.token,
    tokenType: apiState.tokenType,
    expiresIn: apiState.expiresIn,
    createdAt: apiState.createdAt,
  };
  writeFileAtomic(TOKENS_JSON_FILE, `${JSON.stringify(data, null, 2)}\n`);
  log(`Metadata saved to .auth/tokens.json (${keyPrefix})`, 'success');
}

// ============================================
// Help
// ============================================

function showHelp(): void {
  console.log(`
\x1B[1mAPI Login\x1B[0m - Authenticate and store token for tests & MCP tools

\x1B[1mUSAGE\x1B[0m
  bun run api:login [environment] [--method <m>] [--role <r>]

\x1B[1mENVIRONMENTS\x1B[0m
  local       Authenticate against local dev server (default)
  staging     Authenticate against staging server

\x1B[1mMETHODS\x1B[0m (--method, default: signin)
  signin      Sign in with email + password; auto-signup on 401 (mints a PAT)
  pat         Use an existing PAT from .env; validate it against GET /me

\x1B[1mROLES\x1B[0m (--role, default: user)
  user viewer member admin owner
              Selects which {ENV}_{ROLE}_* credentials to use (RBAC test users)

\x1B[1mEXAMPLES\x1B[0m
  bun run api:login                          # local, signin, role=user
  bun run api:login staging                  # staging, signin, role=user
  bun run api:login staging --role admin     # staging admin via signin
  bun run api:login local --method pat --role member   # validate member PAT

\x1B[1mTOKEN STORAGE\x1B[0m
  .auth/api-state.json    Used by Playwright test fixtures
  .auth/tokens.env        Sourceable: export API_TOKEN_<ROLE>_<ENV>='<token>'
                          Powers the agentic curl API-testing maneuver.
  .auth/tokens.json       Metadata (tokenType, expiresIn, createdAt) for
                          freshness checks. No .env write, no MCP restart.

\x1B[1mREQUIRED .env VARIABLES\x1B[0m  ({ENV} = LOCAL|STAGING, {ROLE} = USER|ADMIN|...)
  signin:   {ENV}_{ROLE}_EMAIL, {ENV}_{ROLE}_PASSWORD
  pat:      {ENV}_{ROLE}_API_TOKEN
  Legacy 'user' role keeps LOCAL_USER_EMAIL / STAGING_USER_PASSWORD etc.

\x1B[1mCONFIGURATION\x1B[0m
  Environment URLs:    config/variables.ts (envDataMap)
  Role credentials:    config/variables.ts (resolveTestUser)
  Auth format:         scripts/api-login.ts (PROJECT-SPECIFIC section)

\x1B[1mOPTIONS\x1B[0m
  --method <m>  signin | pat   (default: signin)
  --role <r>    user | viewer | member | admin | owner   (default: user)
  --env <e>     local | staging   (also accepted as positional arg)
  -h, --help    Show this help
`);
}

// ============================================
// Main Execution
// ============================================

console.log(`\n\x1B[1mAPI Login\x1B[0m — ${env.current} · role=${role} · method=${method}\n`);

log(`User: ${testUser.email || '(from PAT)'}`);

// 1. Authenticate via the requested method.
const apiState = method === 'pat'
  ? await authenticateWithPat()
  : await authenticate();
if (!apiState) {
  process.exit(1);
}

log('Authentication successful', 'success');
log(`Token type: ${apiState.tokenType}`);
log(`Expires in: ${apiState.expiresIn} seconds`);

// 2. Save token to api-state.json (Playwright, untouched).
saveApiState(apiState);

// 3. Save token for the agentic curl API-testing maneuver \u2014 no .env write,
// no MCP credential injection (agentic-qa-core/references/api-testing-doctrine.md).
saveTokensEnv(KEY_PREFIX, apiState.token);
saveTokensJson(KEY_PREFIX, apiState);

console.log('\n\x1B[32m\u2713 Login completed!\x1B[0m');
console.log(`\nExecute authenticated requests with: source .auth/tokens.env && curl -H "Authorization: Bearer $API_TOKEN_${KEY_PREFIX}" "$API_BASE_URL/<path>"\n`);
