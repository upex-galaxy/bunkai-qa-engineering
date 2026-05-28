#!/usr/bin/env bun
/**
 * API Login CLI - Authentication Token Generator
 *
 * Authenticates against the project API and stores the token for:
 *   1. Playwright tests  → .auth/api-state.json
 *   2. OpenAPI MCP tools → .env (API_TOKEN var, consumed at MCP-server spawn
 *      via .mcp.json `${API_TOKEN}` and opencode.jsonc `{env:API_TOKEN}`)
 *
 * After running this command, RESTART the terminal session before re-launching
 * Claude Code or OpenCode — MCP servers cache env vars at spawn time.
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

// Validate and override TEST_ENV BEFORE importing config,
// because config/variables.ts reads TEST_ENV at evaluation time.
const validEnvs = ['local', 'staging']; // Must match Environment type in config/variables.ts
const envArg = args[0];
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
const { config, env } = await import('@variables');

// ============================================
// Constants
// ============================================

const PROJECT_ROOT = resolve(import.meta.dir, '..');
const ENV_FILE = resolve(PROJECT_ROOT, '.env');
const ENV_TOKEN_KEY = 'API_TOKEN';

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
  const { email, password } = config.testUser;

  if (!email || !password) {
    const prefix = env.current.toUpperCase();
    log('Missing credentials in .env file:', 'error');
    if (!email) { log(`  - ${prefix}_USER_EMAIL is not set`, 'error'); }
    if (!password) { log(`  - ${prefix}_USER_PASSWORD is not set`, 'error'); }
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
// Token Storage: .env (consumed by MCP servers at spawn)
// ============================================
//
// Both .mcp.json (Claude Code) and opencode.jsonc (OpenCode) reference the
// API_TOKEN env var via expansion (`${API_TOKEN}` and `{env:API_TOKEN}`).
// We only need to keep .env in sync — never write secrets into the committed
// config files. After this runs, the user must restart their terminal
// session so MCP servers pick up the new value at spawn time.

function updateEnvFile(token: string): void {
  if (!existsSync(ENV_FILE)) {
    log(`.env not found at ${ENV_FILE} — copy .env.example to .env first.`, 'error');
    log('Token saved to .auth/api-state.json only. MCP servers will not see it.', 'warn');
    return;
  }

  const raw = readFileSync(ENV_FILE, 'utf-8');
  const trailingNewline = raw.endsWith('\n');
  const lines = raw.split('\n');
  const linePattern = new RegExp(`^${ENV_TOKEN_KEY}\\s*=`);
  const replacement = `${ENV_TOKEN_KEY}=${token}`;

  let replaced = false;
  const updated = lines.map((line) => {
    if (linePattern.test(line)) {
      replaced = true;
      return replacement;
    }
    return line;
  });

  if (!replaced) {
    if (trailingNewline) {
      // Drop the empty trailing element split() produced, append new line, restore newline.
      if (updated[updated.length - 1] === '') {
        updated.pop();
      }
      updated.push(replacement);
      updated.push('');
    }
    else {
      updated.push(replacement);
    }
  }

  const tmpFile = `${ENV_FILE}.tmp`;
  writeFileSync(tmpFile, updated.join('\n'));
  renameSync(tmpFile, ENV_FILE);
  log(`Token saved to .env (${ENV_TOKEN_KEY})`, 'success');
}

// ============================================
// Help
// ============================================

function showHelp(): void {
  console.log(`
\x1B[1mAPI Login\x1B[0m - Authenticate and store token for tests & MCP tools

\x1B[1mUSAGE\x1B[0m
  bun run api:login [environment]

\x1B[1mENVIRONMENTS\x1B[0m
  local       Authenticate against local dev server (default)
  staging     Authenticate against staging server

\x1B[1mEXAMPLES\x1B[0m
  bun run api:login                  # Uses TEST_ENV from .env
  bun run api:login local            # Force local environment
  bun run api:login staging          # Force staging environment

\x1B[1mTOKEN STORAGE\x1B[0m
  .auth/api-state.json    Used by Playwright test fixtures
  .env (API_TOKEN)        Read by .mcp.json (\${API_TOKEN}) and
                          opencode.jsonc ({env:API_TOKEN}) at MCP-server spawn.
                          RESTART your terminal after login so MCPs pick it up.

\x1B[1mREQUIRED .env VARIABLES\x1B[0m
  For local:    LOCAL_USER_EMAIL, LOCAL_USER_PASSWORD
  For staging:  STAGING_USER_EMAIL, STAGING_USER_PASSWORD

\x1B[1mCONFIGURATION\x1B[0m
  Environment URLs:   config/variables.ts (envDataMap)
  Auth format:        scripts/api-login.ts (PROJECT-SPECIFIC section)

\x1B[1mOPTIONS\x1B[0m
  -h, --help    Show this help
`);
}

// ============================================
// Main Execution
// ============================================

console.log(`\n\x1B[1mAPI Login\x1B[0m — ${env.current}\n`);

log(`User: ${config.testUser.email}`);

// 1. Authenticate
const apiState = await authenticate();
if (!apiState) {
  process.exit(1);
}

log('Authentication successful', 'success');
log(`Token type: ${apiState.tokenType}`);
log(`Expires in: ${apiState.expiresIn} seconds`);

// 2. Save token to api-state.json
saveApiState(apiState);

// 3. Sync API_TOKEN into .env so MCP servers pick it up at next spawn.
updateEnvFile(apiState.token);

console.log('\n\x1B[32m\u2713 Login completed!\x1B[0m');
console.log('\n\x1B[33m\u26A0\x1B[0m  RESTART your terminal session before re-launching Claude Code or OpenCode.');
console.log('   MCP servers cache env vars at spawn time \u2014 they will not pick up the');
console.log('   new API_TOKEN until the parent shell is restarted.\n');
