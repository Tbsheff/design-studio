import type { CommentFrame, Project } from '../../shared/contracts.js';
import { readProjectCanvas, type ProjectDirOf } from '../canvas/service.js';
import { findFrame } from '../canvas/tools.js';

export async function canvasFrameOf(project: Project, projectDir: ProjectDirOf, ref: string | undefined): Promise<CommentFrame | null> {
  if (!ref || ref.trim().startsWith('/')) return null;
  const frames = (await readProjectCanvas(project, projectDir).catch(() => null))?.canvas?.frames ?? [];
  if (frames.length === 0 && ref.trim() === 'f1') return { id: 'f1', path: '' };
  const found = findFrame(frames, ref);
  return found ? { id: found.id, path: found.path ?? '', ...(found.label ? { label: found.label } : {}) } : null;
}
