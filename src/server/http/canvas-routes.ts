import type { Context, Hono } from 'hono';
import { z } from 'zod';
import { isDirectionRef, isFrameId, parseCanvasFile } from '../../shared/canvas-file.js';
import type { CanvasPresence } from '../../shared/contracts.js';
import type { CanvasService } from '../canvas/service.js';
import { BadRequestError } from '../store/errors.js';
import type { StudioProjectStore } from '../store/projects.js';

interface CanvasRouteDeps {
  projects: StudioProjectStore;
  canvas: CanvasService;
  readBody: (c: Context) => Promise<Record<string, unknown>>;
}

const writerSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

const presenceSchema = z
  .object({
    directionId: z.string().nullable(),
    activeFrameId: z.string().nullable(),
    inView: z.array(z.string()).max(64),
    selection: z
      .array(z.object({ selector: z.string().max(400), tag: z.string().max(40), text: z.string().max(200) }).strict())
      .max(20),
  })
  .strict();

function parseBaseHash(raw: unknown): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== 'string' || !/^[0-9a-f]{16}$/.test(raw)) throw new BadRequestError('baseHash must be a hash string or null');
  return raw;
}

function parsePresence(raw: unknown): CanvasPresence {
  const parsed = presenceSchema.safeParse(raw);
  if (!parsed.success) throw new BadRequestError('invalid canvas presence');
  const data = parsed.data;
  return {
    directionId: data.directionId && isDirectionRef(data.directionId) ? data.directionId : null,
    activeFrameId: data.activeFrameId && isFrameId(data.activeFrameId) ? data.activeFrameId : null,
    inView: data.inView.filter(isFrameId),
    selection: data.selection,
    at: Date.now(),
  };
}

export function registerCanvasRoutes(app: Hono, deps: CanvasRouteDeps): void {
  const { projects, canvas, readBody } = deps;

  app.get('/api/projects/:pid/canvas', async (c) => {
    const project = await projects.get(c.req.param('pid'));
    const snapshot = await canvas.read(project);
    return c.json({ directionId: canvas.ownerOf(project).id, ...snapshot });
  });

  app.put('/api/projects/:pid/canvas', async (c) => {
    const body = await readBody(c);
    const project = await projects.get(c.req.param('pid'));
    const file = parseCanvasFile(body.canvas);
    if (!file) throw new BadRequestError('canvas must be an object with a frames list');
    const writer = body.writer === undefined ? undefined : writerSchema.safeParse(body.writer);
    if (writer && !writer.success) throw new BadRequestError('invalid writer');
    const baseHash = parseBaseHash(body.baseHash);
    const source = body.migrate === true ? 'migrate' : 'user';
    const snapshot = await canvas.write(project, file, { source, baseHash, ...(writer?.data ? { writer: writer.data } : {}) });
    return c.json({ directionId: canvas.ownerOf(project).id, ...snapshot });
  });

  app.put('/api/projects/:pid/canvas/presence', async (c) => {
    const body = await readBody(c);
    const project = await projects.get(c.req.param('pid'));
    canvas.setPresence(project.id, parsePresence(body));
    return c.body(null, 204);
  });
}
