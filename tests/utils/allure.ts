/**
 * KATA Architecture - Shared Allure Utilities
 *
 * Provides common Allure attachment helpers used across the framework.
 * Centralizes Allure functionality to avoid duplication (DRY principle).
 *
 * Used by:
 * - ApiBase (Layer 2) for API request/response attachments
 * - Interception utilities for captured request/response attachments
 * - Any component needing to attach data to Allure reports
 */

import * as allure from 'allure-js-commons';
import { ContentType } from 'allure-js-commons';

// ============================================
// Types
// ============================================

export interface AllureFilenameArgs {
  /** URL or endpoint path (query params will be stripped) */
  url: string
  /** Suffix to append (e.g., 'GET_response', 'POST_request') */
  suffix: string
}

export interface AttachJsonArgs {
  /** Display name for the attachment in Allure report */
  name: string
  /** JSON-serializable data to attach */
  data: unknown
  /** Content type (defaults to JSON) */
  contentType?: ContentType
}

export interface AttachRequestResponseArgs {
  /** URL or endpoint for filename generation */
  url: string
  /** HTTP method (GET, POST, etc.) */
  method: string
  /** Response body to attach (optional) */
  responseBody?: unknown
  /** Request payload to attach (optional) */
  requestBody?: unknown
}

// ============================================
// Secret Masking
// ============================================

/**
 * Report output is uploaded as CI artifacts from a public repo, so request and
 * response bodies are masked before they reach Allure. Keys that name a secret
 * lose their value; strings that ARE a secret (PAT, Bearer header, or the exact
 * value of a secret-looking env var) are masked wherever they appear.
 */
const MASK = '***';
const SENSITIVE_KEY = /password|secret|token|authorization|api_?key/i;
const SENSITIVE_ENV_NAME = /PASSWORD|SECRET|TOKEN|API_KEY/i;
const SECRET_ENV_VALUES = Object.entries(process.env)
  .filter(([name, value]) => SENSITIVE_ENV_NAME.test(name) && value !== undefined && value.length >= 4)
  .map(([, value]) => value as string);

function maskString(value: string): string {
  let masked = value
    .replace(/Bearer\s+\S+/gi, `Bearer ${MASK}`)
    .replace(/bk_pat_[\w.-]+/g, MASK);
  for (const secret of SECRET_ENV_VALUES) {
    masked = masked.split(secret).join(MASK);
  }
  return masked;
}

/**
 * Deep-copy `data` with every secret masked. Non-secret data (emails, ids,
 * names) is kept as-is so the attachment stays useful for debugging.
 */
export function maskSecrets(data: unknown): unknown {
  if (typeof data === 'string') {
    return maskString(data);
  }
  if (Array.isArray(data)) {
    return data.map(item => maskSecrets(item));
  }
  if (data !== null && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        SENSITIVE_KEY.test(key) && value !== null && typeof value !== 'object' ? MASK : maskSecrets(value),
      ]),
    );
  }
  return data;
}

// ============================================
// Filename Generation
// ============================================

/**
 * Generate a clean filename for Allure attachments from URL/endpoint.
 *
 * Handles both full URLs and endpoint paths:
 * - Full URL: "https://api.example.com/auth/login?foo=bar" → "auth_login_POST_response"
 * - Endpoint: "/api/users/123" → "_api_users_123_GET_response"
 *
 * @example
 * const filename = generateAllureFilename({
 *   url: 'https://api.example.com/auth/login',
 *   suffix: 'POST_response'
 * });
 * // Returns: "auth_login_POST_response"
 */
export function generateAllureFilename(args: AllureFilenameArgs): string {
  const { url, suffix } = args;

  // Remove query params and protocol
  const cleanUrl = url.split('?')[0].replace(/^https?:\/\/[^/]+/, '');

  // Take last 2 path segments for meaningful name
  const segments = cleanUrl.split('/').filter(Boolean).slice(-2);
  const pathPart = segments.length > 0 ? segments.join('_') : 'root';

  // Clean non-alphanumeric chars and limit length
  const cleanPath = pathPart.replace(/[^a-z0-9]/gi, '_').slice(0, 50);

  return `${cleanPath}_${suffix}`;
}

// ============================================
// Attachment Functions
// ============================================

/**
 * Attach JSON data to Allure report with error handling.
 * Secrets are masked first (see `maskSecrets`).
 *
 * Silently fails if Allure is not available (e.g., in setup projects).
 *
 * @example
 * await attachJsonToAllure({
 *   name: 'API Response',
 *   data: { id: 1, name: 'Test' }
 * });
 */
export async function attachJsonToAllure(args: AttachJsonArgs): Promise<void> {
  const { name, data, contentType = ContentType.JSON } = args;

  try {
    if (data === undefined || data === null) {
      return;
    }

    // Check if data is an object with content
    if (typeof data === 'object' && Object.keys(data).length === 0) {
      return;
    }

    const masked = maskSecrets(data);
    const content = typeof masked === 'string' ? masked : JSON.stringify(masked, null, 2);
    await allure.attachment(name, content, contentType);
  }
  catch {
    // Allure might not be available in all contexts
  }
}

/**
 * Attach HTTP request and response bodies to Allure report.
 *
 * Generates appropriate filenames and attaches both request and response
 * if they contain data.
 *
 * @example
 * await attachRequestResponseToAllure({
 *   url: '/api/auth/login',
 *   method: 'POST',
 *   requestBody: { email: 'test@example.com', password: '***' },
 *   responseBody: { access_token: '...' }
 * });
 */
export async function attachRequestResponseToAllure(
  args: AttachRequestResponseArgs,
): Promise<void> {
  const { url, method, responseBody, requestBody } = args;

  try {
    // Attach response body if exists
    if (responseBody !== undefined && responseBody !== null) {
      const isNonEmpty = typeof responseBody !== 'object' || Object.keys(responseBody).length > 0;
      if (isNonEmpty) {
        const filename = generateAllureFilename({ url, suffix: `${method}_response` });
        await attachJsonToAllure({ name: filename, data: responseBody });
      }
    }

    // Attach request body if exists
    if (requestBody !== undefined && requestBody !== null) {
      const isNonEmpty = typeof requestBody !== 'object' || Object.keys(requestBody).length > 0;
      if (isNonEmpty) {
        const filename = generateAllureFilename({ url, suffix: `${method}_request` });
        await attachJsonToAllure({ name: filename, data: requestBody });
      }
    }
  }
  catch {
    // Allure might not be available in all contexts
  }
}
