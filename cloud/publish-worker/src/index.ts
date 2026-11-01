import { handleApi } from './api';
import { ApiError, apiFailure, PAGE_CSP, secure, type Env } from './http';
import { messagePage } from './pages';
import { handleDesign, robots } from './viewer';

const DESIGN = /^\/d\/([^/]+)(?:\/(.*))?$/;

async function route(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) {
    try {
      return await handleApi(request, env, ctx);
    } catch (error) {
      return apiFailure(error);
    }
  }
  if (url.pathname === '/robots.txt') return robots(env);
  const match = DESIGN.exec(url.pathname);
  if (match?.[1]) return handleDesign(request, env, ctx, match[1], match[2] ?? null);
  return secure(messagePage(404, 'Nothing here', 'Open the full link to a design the owner shared with you.'), { csp: PAGE_CSP, noindex: true });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      return await route(request, env, ctx);
    } catch (error) {
      if (error instanceof ApiError && error.status < 500) return secure(messagePage(error.status, 'This request was refused', error.message), { csp: PAGE_CSP, noindex: true });
      console.error('publish worker error', error instanceof Error ? error.stack : String(error));
      return secure(messagePage(500, 'Something went wrong', 'The publish Worker hit an error. Try again later.'), { csp: PAGE_CSP, noindex: true });
    }
  },
} satisfies ExportedHandler<Env>;
