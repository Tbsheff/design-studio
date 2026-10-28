import type { Direction, Project } from '../../shared/contracts.js';
import type { ReviewFrame, ReviewRequest } from '../../shared/review.js';
import type { CanvasService } from '../canvas/service.js';
import { findFrame } from '../canvas/tools.js';
import { BadRequestError } from '../store/errors.js';
import { DEFAULT_REVIEW_FRAME } from './run.js';

async function savedFrame(canvas: CanvasService, project: Project, direction: Direction, ref: string | undefined) {
  const frames = (await canvas.read(project)).canvas?.frames ?? [];
  if (ref) return findFrame(frames, ref);
  const presence = canvas.presence(project.id);
  const live = presence?.directionId === direction.id ? frames.find((frame) => frame.id === presence.activeFrameId) : undefined;
  return live ?? frames.find((frame) => (frame.directionId ?? direction.id) === direction.id && !frame.hidden) ?? null;
}

type SavedFrame = Awaited<ReturnType<typeof savedFrame>>;

function checkSaved(saved: SavedFrame, direction: Direction, input: ReviewRequest, explicit: boolean): void {
  if (input.frame && !saved && !explicit) throw new BadRequestError(`Frame ${input.frame} is not on the canvas. Use canvas_list for the frame ids.`);
  if (saved?.directionId && saved.directionId !== direction.id) throw new BadRequestError(`Frame ${saved.id} shows direction ${saved.directionId}. Pass that directionId.`);
}

function frameNames(saved: SavedFrame, input: ReviewRequest): Pick<ReviewFrame, 'id' | 'label' | 'path' | 'selector'> {
  const id = saved?.id ?? input.frame;
  const path = input.path ?? saved?.path;
  return { ...(id ? { id } : {}), ...(saved?.label ? { label: saved.label } : {}), ...(path ? { path } : {}), ...(input.selector ? { selector: input.selector } : {}) };
}

export async function resolveReviewFrame(canvas: CanvasService, project: Project, direction: Direction, input: ReviewRequest): Promise<ReviewFrame> {
  const explicit = input.width !== undefined && input.height !== undefined;
  const saved = explicit && !input.frame ? null : await savedFrame(canvas, project, direction, input.frame);
  checkSaved(saved, direction, input, explicit);
  return { ...frameNames(saved, input), width: input.width ?? saved?.width ?? DEFAULT_REVIEW_FRAME.width, height: input.height ?? saved?.height ?? DEFAULT_REVIEW_FRAME.height };
}
