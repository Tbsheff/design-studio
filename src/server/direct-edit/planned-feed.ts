import { randomBytes } from 'node:crypto';
import type { DirectEditRequest, DomPatch, TailwindOutcome } from '../../shared/contracts.js';

interface AppliedPatch {
  applied: { text: boolean };
  tailwind?: TailwindOutcome | undefined;
}

export type PlannedEdit =
  | { kind: 'planned'; projectId: string; directionId: string; id: string; patches: DomPatch[] }
  | { kind: 'unplanned'; projectId: string; directionId: string; id: string };

type Listener = (edit: PlannedEdit) => void;

const listeners = new Set<Listener>();

export function onPlannedEdit(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(edit: PlannedEdit): void {
  for (const listener of listeners) {
    try {
      listener(edit);
    } catch (error) {
      console.error('[planned-edit] listener failed', error);
    }
  }
}

function textOf(request: DirectEditRequest, patch: AppliedPatch): string | undefined {
  return patch.applied.text && request.text !== undefined ? request.text : undefined;
}

function hasChange(dom: DomPatch): boolean {
  return dom.style !== undefined || dom.classes !== undefined || dom.text !== undefined;
}

export function domPatchOf(request: DirectEditRequest, patch: AppliedPatch): DomPatch | null {
  if (request.variant || request.move !== undefined || request.insert !== undefined) return null;
  const style = request.style && Object.keys(request.style).length > 0 ? (request.style as Record<string, string | null>) : undefined;
  const delta = patch.tailwind?.mode === 'classes' ? patch.tailwind.delta : undefined;
  const classes = delta && delta.add.length + delta.remove.length > 0 ? delta : undefined;
  const text = textOf(request, patch);
  const dom: DomPatch = {
    selector: request.selector,
    loc: `${request.source.file}:${request.source.line}:${request.source.col}`,
    ...(request.tag ? { tag: request.tag } : {}),
    ...(style ? { style } : {}),
    ...(classes ? { classes } : {}),
    ...(text !== undefined ? { text } : {}),
  };
  return hasChange(dom) ? dom : null;
}

export function announcePlanned(projectId: string, directionId: string, patches: (DomPatch | null)[]): string | null {
  const kept = patches.filter((patch): patch is DomPatch => patch !== null);
  if (kept.length === 0) return null;
  const id = randomBytes(6).toString('hex');
  emit({ kind: 'planned', projectId, directionId, id, patches: kept });
  return id;
}

export function withdrawPlanned(projectId: string, directionId: string, id: string | null): void {
  if (id) emit({ kind: 'unplanned', projectId, directionId, id });
}
