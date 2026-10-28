import { z } from 'zod';
import type { ExportFrame } from '../../shared/export.js';
import { SHARE_DEFAULT_EXPIRY_HOURS, SHARE_EXPIRY_HOURS, SHARE_MAX_FRAMES, shareUrl, type ShareCreated, type ShareList } from '../../shared/share.js';
import { readProjectCanvas } from '../canvas/service.js';
import { findFrame } from '../canvas/tools.js';
import { approve, EditError, loadTarget, oneLine, studioCall, type EditDeps } from './edit-deps.js';
import { defineTool, directionId, ok, projectId } from './edit-kit.js';

const SHARE_NOTE = 'A share link is a read-only PNG snapshot of canvas frames, served on a separate listener on this computer (127.0.0.1) unless the user turns on Allow on local network in the Share dialog. Viewers can only see the images and add comments with a name they type; those comments land as drafts in the studio Comments pane, marked as from a viewer, and never go to the studio agent unless the user sends them. The link has a random token, ends after its expiry and can be revoked. Links are off until someone creates one.';

const createInput = z
  .object({
    projectId,
    directionId,
    frames: z.array(z.string().trim().min(1).max(80)).min(1).max(SHARE_MAX_FRAMES).optional().describe('Frame ids or @labels from canvas_list. Leave out for every visible frame of the direction.'),
    expiresInHours: z.union([z.literal(1), z.literal(24), z.literal(168)]).default(SHARE_DEFAULT_EXPIRY_HOURS).describe(`Hours until the link ends: ${SHARE_EXPIRY_HOURS.join(', ')}.`),
    title: z.string().trim().max(120).optional().describe('Title on the shared page. Leave out for the project name.'),
  })
  .strict();

const listInput = z.object({ projectId }).strict();
const revokeInput = z.object({ projectId, shareId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).describe('Share link id from list_share_links or create_share_link.') }).strict();

async function pickFrames(deps: EditDeps, input: z.output<typeof createInput>): Promise<ExportFrame[] | undefined> {
  if (!input.frames) return undefined;
  const { project } = await loadTarget(deps, input.projectId, input.directionId);
  const all = (await readProjectCanvas(project, (id) => deps.projects.projectDir(id)).catch(() => null))?.canvas?.frames ?? [];
  return input.frames.map((ref) => {
    const found = findFrame(all, ref);
    if (!found) throw new EditError(`No frame ${ref} on the canvas. Call canvas_list for frame ids.`);
    return { name: found.label?.trim() || `${found.width} × ${found.height}`, width: found.width, height: found.height, ...(found.path ? { path: found.path } : {}) };
  });
}

const createShare = defineTool(
  'create_share_link',
  createInput,
  { title: 'Create share link', description: `Make a read-only share link for canvas frames so other people can view the design and comment. The user must click Allow in Design Studio first; without the window open it is refused. Returns the link URL once (only a hash of the token is kept). ${SHARE_NOTE}` },
  async (deps, input, client) => {
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    if (!direction.headVersionId) throw new EditError('This direction has no saved version to share yet.');
    const frames = await pickFrames(deps, input);
    if (!deps.approvals.windowOpen()) throw new EditError('Design Studio is not open, so nobody can approve this share link. Ask the user to open the project in Design Studio, or to click Share there.');
    const names = frames ? frames.map((f) => f.name).join(', ') : 'every visible frame';
    const before = await studioCall<ShareList>(deps, 'GET', `/api/projects/${encodeURIComponent(project.id)}/shares`);
    const reach = before.server.lan ? 'Allow on local network is ON, so other devices on your network can open it too.' : 'It serves on this computer only (127.0.0.1); local network access stays off.';
    await approve(deps, {
      tool: 'create_share_link',
      action: 'Turn on a read-only share link',
      projectId: project.id,
      client,
      title: `${client} wants to share “${oneLine(input.title || project.name, 80)}” as a read-only link`,
      detail: `Anyone with the link can see PNG snapshots of ${oneLine(names, 200)} and add comments for ${input.expiresInHours} h. ${reach} You can revoke it from Share.`,
    });
    const created = await studioCall<ShareCreated>(deps, 'POST', `/api/projects/${encodeURIComponent(project.id)}/shares`, {
      directionId: direction.id,
      expiresInHours: input.expiresInHours,
      ...(frames ? { frames } : {}),
      ...(input.title ? { title: input.title } : {}),
    });
    const base = created.server.localUrl;
    return { result: ok({ link: created.link, url: base ? shareUrl(base, created.token) : null, note: 'Give this URL to the user. It is not shown again.' }) };
  },
);

const listShares = defineTool(
  'list_share_links',
  listInput,
  { title: 'List share links', description: `List the share links of a project: id, title, frames, expiry, whether each is active, and how many viewer comments came in. Read only; it never returns tokens or URLs. Read viewer comments with list_comments. ${SHARE_NOTE}`, readOnly: true, idempotent: true },
  async (deps, input) => {
    const { project } = await loadTarget(deps, input.projectId);
    const list = await studioCall<ShareList>(deps, 'GET', `/api/projects/${encodeURIComponent(project.id)}/shares`);
    return { result: ok({ links: list.links.map((l) => ({ id: l.id, title: l.title, active: l.active, expiresAt: new Date(l.expiresAt).toISOString(), revoked: l.revokedAt !== null, frames: l.frames.map((f) => f.name), comments: l.comments })), server: { running: list.server.running, localNetwork: list.server.lan } }) };
  },
);

const revokeShare = defineTool(
  'revoke_share_link',
  revokeInput,
  { title: 'Revoke share link', description: 'Turn off a share link now. The link, its images and its comment form stop working at once and the snapshot images are deleted. Comments already sent stay in the Comments pane.', destructive: true, idempotent: true },
  async (deps, input) => {
    const { project } = await loadTarget(deps, input.projectId);
    const done = await studioCall<{ link: unknown }>(deps, 'DELETE', `/api/projects/${encodeURIComponent(project.id)}/shares/${encodeURIComponent(input.shareId)}`);
    return { result: ok(done) };
  },
);

export const SHARE_TOOLS = [createShare, listShares, revokeShare];
