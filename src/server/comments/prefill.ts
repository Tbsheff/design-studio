import { readFile } from 'node:fs/promises';
import type { Attachment, CommentPrefill, DesignComment, Direction, Project } from '../../shared/contracts.js';
import { CHAT_IMAGE_MAX, canPickForChat, chatPrompt } from '../../shared/comments.js';
import { withFrameStateHost } from '../../shared/frame-state.js';
import type { ExportFrame } from '../../shared/export.js';
import { frameStatesView, stateOfFrame } from '../app/frame-state.js';
import { readProjectCanvas } from '../canvas/service.js';
import { findFrame } from '../canvas/tools.js';
import { captureFrame } from '../export/capture.js';
import { ConflictError, NotFoundError } from '../store/errors.js';
import type { PreviewService } from '../types.js';

export interface PrefillDeps {
  preview: PreviewService;
  projectDir: (projectId: string) => string;
  getAttachment: (projectId: string, attachmentId: string) => Promise<Attachment>;
  saveAttachment: (projectId: string, file: { name: string; mime: string; bytes: Uint8Array }) => Promise<Attachment>;
}

interface ShotPlace {
  url: string;
  frame: ExportFrame;
}

const CROP_PADDING = 24;
const WARM_TIMEOUT_MS = 60_000;
const DEFAULT_SIZE = { width: 1440, height: 900 };

export function pickComments(all: DesignComment[], ids: string[]): DesignComment[] {
  return ids.map((id) => {
    const comment = all.find((item) => item.id === id);
    if (!comment) throw new NotFoundError(`comment ${id} not found`);
    if (!canPickForChat(comment.status)) throw new ConflictError(`comment #${comment.n} is ${comment.status}`);
    return comment;
  });
}

async function warmApp(deps: PrefillDeps, project: Project, page: string | undefined): Promise<void> {
  const upstream = project.app ? await deps.preview.apps?.ensure(project).catch(() => null) : null;
  if (!upstream) return;
  const answer = await fetch(new URL(`/${page ?? ''}`, upstream), { redirect: 'manual', signal: AbortSignal.timeout(WARM_TIMEOUT_MS) }).catch(() => null);
  await answer?.body?.cancel().catch(() => undefined);
}

async function placeOf(deps: PrefillDeps, project: Project, baseUrl: string, comment: DesignComment): Promise<ShotPlace> {
  const ref = comment.frame?.id;
  const frames = ref ? ((await readProjectCanvas(project, deps.projectDir)).canvas?.frames ?? []) : [];
  const found = ref ? findFrame(frames, ref) : null;
  const path = found?.path ?? comment.frame?.path ?? '';
  const size = found ? { width: found.width, height: found.height } : DEFAULT_SIZE;
  const state = project.app && found ? stateOfFrame(await frameStatesView(deps.projectDir(project.id)), found.id) : undefined;
  return { url: withFrameStateHost(baseUrl, state), frame: { name: `comment-${comment.n}`, ...size, ...(path ? { path } : {}) } };
}

async function dataUrlOf(file: string, mime: string): Promise<string> {
  return `data:${mime};base64,${(await readFile(file)).toString('base64')}`;
}

async function cropOf(deps: PrefillDeps, project: Project, baseUrl: string, comment: DesignComment): Promise<Buffer> {
  const place = await placeOf(deps, project, baseUrl, comment);
  await warmApp(deps, project, place.frame.path);
  const selector = comment.context?.selector ?? comment.target.selector;
  const shot = await captureFrame(deps.preview, place.url, place.frame, 1, 'frame', selector, 1600, CROP_PADDING);
  return shot.png;
}

async function imageOf(deps: PrefillDeps, project: Project, baseUrl: string, comment: DesignComment): Promise<CommentPrefill['attachments'][number]> {
  const drawn = comment.drawing ? comment.attachmentIds?.[0] : undefined;
  if (drawn) {
    const saved = await deps.getAttachment(project.id, drawn);
    return { id: saved.id, name: saved.name, dataUrl: await dataUrlOf(saved.path, saved.mime) };
  }
  const png = await cropOf(deps, project, baseUrl, comment);
  const saved = await deps.saveAttachment(project.id, { name: `comment-${comment.n}.png`, mime: 'image/png', bytes: new Uint8Array(png) });
  return { id: saved.id, name: saved.name, dataUrl: `data:image/png;base64,${png.toString('base64')}` };
}

export async function buildPrefill(deps: PrefillDeps, project: Project, direction: Direction, chosen: DesignComment[]): Promise<CommentPrefill> {
  const baseUrl = await deps.preview.directionUrl(project, direction);
  const attachments: CommentPrefill['attachments'] = [];
  const notes: string[] = [];
  for (const comment of chosen) {
    if (attachments.length >= CHAT_IMAGE_MAX) {
      notes.push(`(#${comment.n} has no crop: the chat takes ${CHAT_IMAGE_MAX} images.)`);
      continue;
    }
    try {
      attachments.push(await imageOf(deps, project, baseUrl, comment));
    } catch (error) {
      console.error('[comments] crop failed', comment.id, error);
      notes.push(`(#${comment.n} has no crop: the element was not found on the page.)`);
    }
  }
  return { text: chatPrompt(chosen, notes), commentIds: chosen.map((comment) => comment.id), attachments };
}
