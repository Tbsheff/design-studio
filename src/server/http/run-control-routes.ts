import type { Hono } from 'hono';
import { z } from 'zod';
import { BadRequestError, NotFoundError, assertSafeId } from '../store/errors.js';
import { RULE_MAX_CHARS } from '../../shared/permissionRules.js';
import type { AgentRunner, RunHandle } from '../types.js';

const TEXT_MAX = 20_000;

const queueSchema = z
  .object({
    items: z
      .array(z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/), text: z.string().max(TEXT_MAX) }).strict())
      .max(20),
  })
  .strict();

const steerSchema = z.object({ text: z.string().trim().min(1).max(TEXT_MAX) }).strict();

const answerSchema = z.union([z.object({ allow: z.literal(true), always: z.string().min(1).max(RULE_MAX_CHARS).optional() }).strict(), z.object({ allow: z.literal(false), note: z.string().max(2000).optional() }).strict()]);

async function parse<T>(schema: z.ZodType<T>, text: string): Promise<T> {
  let body: unknown;
  try {
    body = text.trim() === '' ? {} : JSON.parse(text);
  } catch {
    throw new BadRequestError('body must be JSON');
  }
  const result = schema.safeParse(body);
  if (!result.success) throw new BadRequestError(result.error.issues[0]?.message ?? 'bad body');
  return result.data;
}

function activeHandle(runner: AgentRunner, raw: string): RunHandle {
  const handle = runner.get(assertSafeId(raw, 'runId'));
  if (!handle) throw new NotFoundError('run is not active');
  return handle;
}

export function registerRunControlRoutes(app: Hono, runner: AgentRunner): void {
  app.put('/api/runs/:runId/queue', async (c) => {
    const handle = activeHandle(runner, c.req.param('runId'));
    const { items } = await parse(queueSchema, await c.req.text());
    if (!handle.setQueue?.(items)) return c.json({ error: 'run_finished' }, 409);
    return c.json({ ok: true });
  });

  app.post('/api/runs/:runId/steer', async (c) => {
    const handle = activeHandle(runner, c.req.param('runId'));
    const { text } = await parse(steerSchema, await c.req.text());
    if (!handle.steer?.(text)) return c.json({ error: 'run_finished' }, 409);
    return c.json({ ok: true });
  });

  app.post('/api/runs/:runId/permissions/:requestId', async (c) => {
    const handle = activeHandle(runner, c.req.param('runId'));
    const requestId = c.req.param('requestId');
    if (!/^[A-Za-z0-9_-]{1,120}$/.test(requestId)) throw new BadRequestError('bad request id');
    const decision = await parse(answerSchema, await c.req.text());
    if (!handle.answer?.(requestId, decision.allow ? { allow: true, ...(decision.always !== undefined ? { always: decision.always } : {}) } : { allow: false, ...(decision.note?.trim() ? { note: decision.note.trim() } : {}) })) {
      throw new NotFoundError('permission request is not open');
    }
    return c.json({ ok: true });
  });
}
