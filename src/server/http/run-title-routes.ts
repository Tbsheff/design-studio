import { randomBytes } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Hono } from 'hono';
import { z } from 'zod';
import type { RunSummary } from '../../shared/contracts.js';
import { BadRequestError, ConflictError, NotFoundError, assertSafeId } from '../store/errors.js';
import { createKeyedMutex } from '../store/mutex.js';
import type { AgentRunner } from '../types.js';

export const RUN_TITLE_MAX = 80;

const titleSchema = z.object({ title: z.string().trim().max(RUN_TITLE_MAX) }).strict();

interface Deps {
  runner: AgentRunner;
  findRunProject: (runId: string) => Promise<string | null>;
  runsDir: (projectId: string) => string;
}

async function parseTitle(text: string): Promise<string> {
  let body: unknown;
  try {
    body = text.trim() === '' ? {} : JSON.parse(text);
  } catch {
    throw new BadRequestError('body must be JSON');
  }
  const result = titleSchema.safeParse(body);
  if (!result.success) throw new BadRequestError(result.error.issues[0]?.message ?? 'bad body');
  return result.data.title;
}

export function registerRunTitleRoutes(app: Hono, deps: Deps): void {
  const lock = createKeyedMutex();
  app.patch('/api/runs/:runId', async (c) => {
    const runId = assertSafeId(c.req.param('runId'), 'runId');
    const title = await parseTitle(await c.req.text());
    const pid = await deps.findRunProject(runId);
    if (pid === null) throw new NotFoundError(`run ${runId} not found`);
    const file = path.join(deps.runsDir(pid), `${runId}.json`);
    const summary = await lock(runId, async () => {
      let current: RunSummary;
      try {
        current = JSON.parse(await readFile(file, 'utf8')) as RunSummary;
      } catch {
        throw new NotFoundError(`run ${runId} not found`);
      }
      if (current.status === 'running' && deps.runner.isRunning(pid, current.directionId)) throw new ConflictError('run_in_progress');
      const { title: _old, ...rest } = current;
      const next: RunSummary = title ? { ...rest, title } : rest;
      const temp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
      await writeFile(temp, `${JSON.stringify(next, null, 2)}\n`);
      await rename(temp, file);
      return next;
    });
    return c.json(summary);
  });
}
