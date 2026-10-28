import type { CanvasFileFrame } from '../../shared/canvas-file.js';
import type { Version } from '../../shared/contracts.js';
import { findFrame, type PlaceSpec } from '../canvas/tools.js';

const RELATION_WORDS = { below: 'below', rightOf: 'right of', leftOf: 'left of', above: 'above' } as const;
const STYLE_WORDS: Record<string, string> = { 'background-color': 'background' };
const MAX_LISTED = 3;

export function listWords(words: readonly string[]): string {
  const unique = [...new Set(words)];
  const shown = unique.length > MAX_LISTED ? [...unique.slice(0, MAX_LISTED - 1), `${unique.length - MAX_LISTED + 1} more`] : unique;
  if (shown.length <= 1) return shown[0] ?? '';
  return `${shown.slice(0, -1).join(', ')} and ${shown.at(-1)}`;
}

export function frameName(frame: CanvasFileFrame | null | undefined, fallback: string): string {
  if (!frame) return fallback.replace(/^@/, '');
  return frame.label ?? frame.path ?? frame.id;
}

function relationText(spec: PlaceSpec, frames: readonly CanvasFileFrame[]): string {
  for (const key of Object.keys(RELATION_WORDS) as (keyof typeof RELATION_WORDS)[]) {
    const ref = spec[key];
    if (ref) return ` ${RELATION_WORDS[key]} ${frameName(findFrame(frames, ref), ref)}`;
  }
  return '';
}

export function placedFrames(specs: readonly PlaceSpec[], before: readonly CanvasFileFrame[], after: readonly CanvasFileFrame[]): CanvasFileFrame[] {
  const named = specs.flatMap((spec) => (spec.frame ? [findFrame(after, spec.frame)?.id] : []));
  const known = new Set([...before.map((frame) => frame.id), ...named]);
  const added = after.filter((frame) => !known.has(frame.id));
  let next = 0;
  return specs.flatMap((spec) => {
    const frame = spec.frame ? findFrame(after, spec.frame) : (added[next++] ?? null);
    return frame ? [frame] : [];
  });
}

export function placeSummary(verb: string, specs: readonly PlaceSpec[], placed: readonly CanvasFileFrame[], after: readonly CanvasFileFrame[]): string {
  const first = specs[0];
  if (specs.length === 1 && first) return `${verb} ${frameName(placed[0], first.frame ?? 'a frame')}${relationText(first, after)}`;
  return `${verb} ${listWords(placed.map((frame) => frameName(frame, frame.id)))}`;
}

export function editSummary(tag: string, style: Record<string, unknown> | undefined, text: string | undefined, classes = false): string {
  const parts = Object.keys(style ?? {}).map((prop) => STYLE_WORDS[prop] ?? prop.replace(/-/g, ' '));
  if (classes) parts.push('classes');
  if (text !== undefined) parts.push('text');
  return `Edited ${tag} ${listWords(parts)}`;
}

export function versionName(version: Version): string {
  const title = version.name ?? version.title;
  const flat = title.replace(/\s+/g, ' ').trim();
  return flat.length > 48 ? `${flat.slice(0, 47)}…` : flat;
}
