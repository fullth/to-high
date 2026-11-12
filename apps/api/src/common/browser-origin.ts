import type { RequestHandler } from 'express';

/** CORS is a browser policy, not proof that a caller is our frontend. */
export function browserOrigins(
  frontendUrl: string | undefined,
  production: boolean,
): string[] {
  const origins = production
    ? []
    : ['http://localhost:3001', 'http://localhost:3002'];
  if (!frontendUrl) {
    if (production) throw new Error('FRONTEND_URL is required in production');
    return origins;
  }
  const url = new URL(frontendUrl);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    !['http:', 'https:'].includes(url.protocol) ||
    (production &&
      (url.protocol !== 'https:' ||
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
  )
    throw new Error('FRONTEND_URL must be a trusted frontend origin');
  return [...new Set([...origins, url.origin])];
}

/** Reject before body parsing, quota consumption or paid model dispatch. */
export function browserOriginBoundary(
  origins: readonly string[],
  production: boolean,
): RequestHandler {
  return (request, response, next) => {
    const origin = request.headers.origin;
    const path = request.path.toLowerCase();
    const protectedPath = [
      '/ephemeral',
      '/saved-sessions',
      '/admin/budget',
    ].some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
    if (
      (origin !== undefined && !origins.includes(origin)) ||
      (production && protectedPath && !origin)
    ) {
      response.status(403).json({ statusCode: 403, message: 'Forbidden' });
      return;
    }
    if (
      protectedPath &&
      ['POST', 'PUT', 'PATCH'].includes(request.method) &&
      !request.is('application/json')
    ) {
      response.status(415).json({ statusCode: 415, message: 'JSON required' });
      return;
    }
    next();
  };
}
