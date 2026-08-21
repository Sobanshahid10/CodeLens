/**
 * Authentication management module.
 *
 * Security Architecture Decision:
 * We store the JWT access token purely in memory (_token module-level variable).
 * We strictly NEVER persist JWTs in localStorage or sessionStorage to mitigate
 * Cross-Site Scripting (XSS) token exfiltration attacks.
 */

let _token: string | null = null;

export const setToken = (token: string | null): void => {
  _token = token;
};

export const getToken = (): string | null => {
  return _token;
};

export const clearToken = (): void => {
  _token = null;
};

export const isAuthenticated = (): boolean => {
  return _token !== null && _token.length > 0;
};

/**
 * Initiates the GitHub OAuth 2.0 authorization code grant flow
 * by redirecting the browser to the backend OAuth authorization route.
 */
export const redirectToGitHubOAuth = (): void => {
  window.location.href = '/auth/github';
};
