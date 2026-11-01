import type { Context, Hono } from 'hono';
import type { PublicationList, PublishPlanInput } from '../../shared/publish.js';
import { assertSafeId, BadRequestError } from '../store/errors.js';
import { createPublishService, type PublishDeps, type PublishService } from '../publish/service.js';

export interface PublishRouteDeps extends PublishDeps {
  readBody: (c: Context) => Promise<Record<string, unknown>>;
}

function planInput(raw: Record<string, unknown>): PublishPlanInput {
  const input: PublishPlanInput = {};
  if (typeof raw.directionId === 'string') input.directionId = raw.directionId;
  if (typeof raw.versionId === 'string') input.versionId = raw.versionId;
  if (Array.isArray(raw.frames)) input.frames = raw.frames as PublishPlanInput['frames'];
  if (Array.isArray(raw.frameIds)) input.frameIds = raw.frameIds.filter((id): id is string => typeof id === 'string');
  if (typeof raw.title === 'string') input.title = raw.title;
  if (typeof raw.password === 'string') input.password = raw.password;
  if (typeof raw.keepPassword === 'boolean') input.keepPassword = raw.keepPassword;
  if (typeof raw.expiresInDays === 'number') input.expiresInDays = raw.expiresInDays as PublishPlanInput['expiresInDays'];
  if (typeof raw.comments === 'boolean') input.comments = raw.comments;
  if (typeof raw.publicationId === 'string') input.publicationId = raw.publicationId;
  return input;
}

export function registerPublishRoutes(app: Hono, deps: PublishRouteDeps): PublishService {
  const service = createPublishService(deps);

  app.get('/api/publish/cli', async (c) => c.json(await service.cli.state(c.req.query('fresh') === '1')));

  app.post('/api/publish/login', async (c) => {
    const body = await deps.readBody(c);
    return c.json(await service.cli.startLogin(body.keyring !== false, body.narrow !== false));
  });

  app.delete('/api/publish/login', async (c) => c.json(await service.cli.cancelLogin()));
  app.post('/api/publish/logout', async (c) => c.json(await service.cli.logout()));

  app.put('/api/publish/settings', async (c) => {
    const body = await deps.readBody(c);
    if (body.accountId !== null && typeof body.accountId !== 'string') throw new BadRequestError('accountId must be a string or null');
    return c.json(await service.cli.setAccount(body.accountId));
  });

  app.get('/api/projects/:pid/publications', async (c) => {
    const pid = assertSafeId(c.req.param('pid'), 'projectId');
    return c.json({ publications: await service.list(pid) } satisfies PublicationList);
  });

  app.post('/api/projects/:pid/publish/plan', async (c) => {
    const pid = assertSafeId(c.req.param('pid'), 'projectId');
    return c.json(await service.plan(pid, planInput(await deps.readBody(c))));
  });

  app.post('/api/projects/:pid/publish', async (c) => {
    const pid = assertSafeId(c.req.param('pid'), 'projectId');
    const body = await deps.readBody(c);
    if (typeof body.planId !== 'string') throw new BadRequestError('planId is required');
    return c.json({ publication: await service.publish(pid, body.planId) });
  });

  app.delete('/api/projects/:pid/publications/:id', async (c) => {
    const pid = assertSafeId(c.req.param('pid'), 'projectId');
    return c.json({ publication: await service.unpublish(pid, c.req.param('id')) });
  });

  return service;
}
