import type { Context, Hono } from 'hono';
import { STUDIO_TOKEN_HEADER } from '../../shared/contracts.js';
import type { McpActivityList, McpApprovalPoll } from '../../shared/export.js';
import type { CanvasService } from '../canvas/service.js';
import type { EditRecorder } from '../direct-edit/index.js';
import type { ExportDeps } from '../export/source.js';
import { createActivityLog, type ActivityLog } from '../mcp/activity.js';
import { createApprovalQueue } from '../mcp/approvals.js';
import { createMcpService } from '../mcp/server.js';
import { warmUpstream } from '../mcp/tools.js';
import { onSourceChange } from '../direct-edit/change-feed.js';
import { recentPages, startRender } from '../preview/render-wait.js';
import { BadRequestError, NotFoundError } from '../store/errors.js';
import type { AgentRunner, EventBus } from '../types.js';

interface McpRouteDeps extends ExportDeps {
  dataDir: string;
  studioToken: string;
  runner: AgentRunner;
  canvas: CanvasService;
  bus: EventBus;
  projectsFolder: () => Promise<string>;
  appOpen: () => boolean;
  history?: EditRecorder;
}

const MAX_WAIT_S = 25;

async function body(c: Context): Promise<Record<string, unknown>> {
  const parsed: unknown = await c.req.json().catch(() => null);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new BadRequestError('body must be a JSON object');
  return parsed as Record<string, unknown>;
}

function warmAfterEdits(deps: McpRouteDeps): void {
  onSourceChange((change) => {
    const pages = recentPages(change.projectId);
    if (pages.length === 0) return;
    startRender(change.projectId, async (signal) => {
      const project = await deps.projects.get(change.projectId);
      const upstream = project.app ? await deps.preview.apps?.ensure(project).catch(() => null) : null;
      if (!upstream) return;
      const live = new Set(await deps.preview.livePages?.(project.id));
      for (const page of recentPages(project.id)) {
        if (signal.aborted) return;
        if (!live.has(`/${page}`)) await warmUpstream(upstream, page || undefined, signal);
      }
    });
  });
}

export function registerMcpRoutes(app: Hono, deps: McpRouteDeps): { activity: ActivityLog } {
  const approvals = createApprovalQueue({
    appOpen: deps.appOpen,
    events: {
      opened: (approval) => {
        if (approval.projectId) deps.bus.emit({ type: 'mcp.approval', projectId: approval.projectId, approval });
      },
      resolved: (approval, outcome) => {
        if (approval.projectId) deps.bus.emit({ type: 'mcp.approval.resolved', projectId: approval.projectId, approvalId: approval.id, outcome });
      },
    },
  });
  const request = async (method: string, url: string, payload?: unknown): Promise<Response> =>
    app.request(url, {
      method,
      headers: { [STUDIO_TOKEN_HEADER]: deps.studioToken, ...(payload !== undefined ? { 'content-type': 'application/json' } : {}) },
      ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
    });
  const activity = createActivityLog(deps.dataDir, deps.bus);
  warmAfterEdits(deps);
  const mcp = createMcpService(deps.dataDir, deps, { ...deps, request, approvals, activity });
  void mcp.boot();

  const denyPending = (): void => {
    for (const item of approvals.list()) approvals.answer(item.id, false);
  };

  app.get('/api/mcp', async (c) => c.json(await mcp.status()));

  app.get('/api/projects/:pid/mcp/activity', async (c) => {
    const project = await deps.projects.get(c.req.param('pid'));
    return c.json({ activity: await activity.list(project.id) } satisfies McpActivityList);
  });

  app.post('/api/mcp', async (c) => {
    const input = await body(c);
    if (input.rotate === true) await mcp.rotate();
    if (typeof input.edits === 'boolean') {
      await mcp.setEdits(input.edits);
      if (!input.edits) denyPending();
    }
    if (typeof input.enabled === 'boolean') {
      if (!input.enabled) denyPending();
      return c.json(await mcp.setEnabled(input.enabled));
    }
    return c.json(await mcp.status());
  });

  app.get('/api/mcp/approvals', async (c) => {
    if (!(await mcp.editsOn())) return c.json({ edits: false, pending: [] } satisfies McpApprovalPoll);
    const wait = Math.min(MAX_WAIT_S, Math.max(0, Number.parseInt(c.req.query('wait') ?? '0', 10) || 0));
    const pending = await approvals.poll(c.req.query('seen') ?? '', wait * 1000, c.req.raw.signal);
    return c.json({ edits: true, pending } satisfies McpApprovalPoll);
  });

  app.post('/api/mcp/approvals/:id', async (c) => {
    const input = await body(c);
    if (typeof input.allow !== 'boolean') throw new BadRequestError('allow must be true or false');
    if (!approvals.answer(c.req.param('id'), input.allow)) throw new NotFoundError('approval request is not open');
    return c.json({ ok: true });
  });
  return { activity };
}
