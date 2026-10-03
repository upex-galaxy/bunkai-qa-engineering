/**
 * KATA Architecture - Environment Variables Configuration
 *
 * PROJECT-OWNED. `bun run up` never overwrites this file: every project adapts
 * its environments, its URLs, its credential map and its auth endpoints, and
 * that adaptation is the point.
 *
 * The synced half is `config/variables.core.ts`. It holds the `.env` bootstrap,
 * the Atlassian instance-resolver wiring, and the TMS / browser / reporting
 * blocks that synced code reads. Those used to live here, which meant an
 * adapted copy of this file stopped receiving resolver fixes — and the resolver
 * feeds `config.tms.jira.url`, the host the Jira-Direct TMS provider WRITES
 * results back onto. A stale host there does not fail loudly; it writes to the
 * wrong site in silence.
 *
 * WHAT TO EDIT HERE: `Environment`, `UserRole`, `envDataMap`,
 * `userCredentialsMap`, `resolveTestUser()`, and the `auth` block. Everything else is imported and should be changed upstream.
 *
 * Bun automatically loads .env files - no dotenv dependency needed.
 * But the Playwright VSCode extension requires reading process.env as Node.js,
 * so the core calls loadEnvFile() at import time.
 *
 * Usage:
 *   import { config, env } from '@variables';
 */

import {
  BROWSER_CONFIG,
  CORE_ENV,
  REPORTING_CONFIG,
  TMS_CONFIG,
} from './variables.core';

// ============================================
// Environment Type Definitions
// ============================================

export type Environment = 'local' | 'staging'; // Add more when needed (e.g., 'production')

// RBAC roles mirrored from Bunkai TMS (viewer/member/admin/owner). 'user' is the
// default/legacy role that maps to the original {ENV}_USER_* keys for backward
// compatibility. Each role resolves credentials and an optional PAT independently.
export type UserRole = 'user' | 'viewer' | 'member' | 'admin' | 'owner';

// ============================================
// Test-User Credentials (variables from .env)
// Which variable holds which environment's credentials is project vocabulary,
// so the read stays here rather than in the synced core.
// After validation, current environment credentials are guaranteed to exist.
// ============================================

const {
  LOCAL_USER_EMAIL, // Required if TEST_ENV=local
  LOCAL_USER_PASSWORD, // Required if TEST_ENV=local
  STAGING_USER_EMAIL, // Required if TEST_ENV=staging
  STAGING_USER_PASSWORD, // Required if TEST_ENV=staging
} = process.env;

const userCredentialsMap: Record<Environment, { email: string, password: string }> = {
  local: {
    email: LOCAL_USER_EMAIL ?? '',
    password: LOCAL_USER_PASSWORD ?? '',
  },
  staging: {
    email: STAGING_USER_EMAIL ?? '',
    password: STAGING_USER_PASSWORD ?? '',
  },
};

// ============================================
// Environment Detection
// ============================================

export const env = {
  ...CORE_ENV,
  current: CORE_ENV.current as Environment,
  isLocal: CORE_ENV.current === 'local',
  isStaging: CORE_ENV.current === 'staging',
} as const;

// ============================================
// Role-aware credential resolution (multi-user per environment)
// ============================================
//
// Reads role-scoped env vars on demand: {ENV}_{ROLE}_EMAIL, {ENV}_{ROLE}_PASSWORD
// and {ENV}_{ROLE}_API_TOKEN. The 'user' role keeps the legacy {ENV}_USER_* keys.
// Like the credential map above, this read stays in the project half: role and
// variable names are project vocabulary, never the synced core's.
//
// Examples:
//   resolveTestUser('user')             → LOCAL_USER_EMAIL / LOCAL_USER_PASSWORD
//   resolveTestUser('admin', 'staging') → STAGING_ADMIN_EMAIL / STAGING_ADMIN_PASSWORD
//                                          STAGING_ADMIN_API_TOKEN (for PAT auth)

export interface TestUserCredentials {
  email: string
  password: string
  apiToken: string
}

export function resolveTestUser(
  role: UserRole = 'user',
  environment: Environment = env.current,
): TestUserCredentials {
  const ENV = environment.toUpperCase();
  const ROLE = role.toUpperCase();
  return {
    email: process.env[`${ENV}_${ROLE}_EMAIL`] ?? '',
    password: process.env[`${ENV}_${ROLE}_PASSWORD`] ?? '',
    apiToken: process.env[`${ENV}_${ROLE}_API_TOKEN`] ?? '',
  };
}

// ============================================
// ENV DATA Mapping (hardcoded - not secrets because these are not sensitive data like credentials)
// ============================================

const envDataMap: Record<
  Environment,
  { base: string, api: string, user: { email: string, password: string } }
> = {
  local: {
    base: 'http://localhost:3000',
    api: 'http://localhost:3000/api/v1',
    user: userCredentialsMap.local,
  },
  staging: {
    // Staging URL TBD — BK-29 marks staging as "por publicar" pre-GA.
    // Tentative host from .agents/project.yaml; update once Bunkai publishes it.
    base: 'https://staging-upexbunkai.vercel.app',
    api: 'https://staging-upexbunkai.vercel.app/api/v1',
    user: userCredentialsMap.staging,
  },
};
const envData = envDataMap[env.current];

// ============================================
// Main Configuration Object
// ============================================

export const config = {
  // URLs - selected by TEST_ENV from urlMap
  baseUrl: envData.base,
  apiUrl: envData.api,

  // Authentication config (Bunkai endpoints - relative to apiUrl which already includes /api/v1)
  auth: {
    loginEndpoint: '/auth/signin',
    signupEndpoint: '/auth/signup',
    tokenEndpoint: '/tokens', // PAT mint endpoint (session-authenticated); also intercepted for token via page.waitForResponse
    meEndpoint: '/me',
    tokenLifetimeSeconds: 86400, // 24 hours (1 day) — PATs default to no expiry; this is just the local-cache hint
    // Storage paths for authenticated sessions
    storageStatePath: '.auth/user.json',
    apiStatePath: '.auth/api-state.json',
  },

  // Test User (configure in .env)
  testUser: envData.user,

  // TMS / Browser / Reporting — synced (config/variables.core.ts)
  tms: TMS_CONFIG,
  browser: BROWSER_CONFIG,
  reporting: REPORTING_CONFIG,
} as const;
