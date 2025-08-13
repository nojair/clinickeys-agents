/**
 * Shared API‑layer types used across services and hooks.
 *
 * Location: @/shared/types/api.ts
 */

/**
 * Standardised error object thrown by {@link fetchJson} when the backend
 * responds with any HTTP status outside the 2xx range.
 *
 * The backend (per spec) returns a JSON body like:
 * ```json
 * { "error": "Human‑readable message", "details": { ... } }
 * ```
 * We surface both the status code and the full payload for advanced
 * handlers (e.g. forms that need field‑level error information).
 */
export interface ApiError extends Error {
  /** HTTP status code (e.g. 400, 404, 500). */
  status: number;
  /** Backend response payload (parsed JSON or plain text). */
  data?: unknown;
}

/**
 * Cursor‑based paginated response used by list endpoints.
 *
 * Example backend response:
 * ```json
 * {
 *   "items": [ ... ],
 *   "nextCursor": "abcdef" // or null when no more pages
 * }
 * ```
 */
export interface Paginated<T> {
  items: T[];
  nextCursor?: string | null;
}

/** Convenience alias for optional query cursors */
export type Cursor = string | null | undefined;
