import type { RunPart } from './contracts.js';

export type PartEvent =
  | { type: 'run.text.delta'; text: string }
  | { type: 'run.text'; text: string }
  | { type: 'run.thinking.delta'; text: string }
  | { type: 'run.thinking'; text: string }
  | { type: 'run.tool.started'; toolUseId: string }
  | { type: 'run.user'; id: string; text: string };

type StreamKind = 'text' | 'thinking';

function lastOpenIndex(parts: readonly RunPart[], kind: StreamKind): number {
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index];
    if (part?.kind === kind && part.open) return index;
  }
  return -1;
}

function appendDelta(parts: readonly RunPart[], kind: StreamKind, text: string): RunPart[] {
  const last = parts.at(-1);
  if (last && last.kind === kind && last.open) return [...parts.slice(0, -1), { kind, text: last.text + text, open: true }];
  return [...parts, { kind, text, open: true }];
}

function closeBlock(parts: readonly RunPart[], kind: StreamKind, text: string): RunPart[] {
  const index = lastOpenIndex(parts, kind);
  if (index === -1) return [...parts, { kind, text }];
  const next = [...parts];
  next[index] = { kind, text };
  return next;
}

export function applyPartEvent(parts: readonly RunPart[], event: PartEvent): RunPart[] {
  switch (event.type) {
    case 'run.text.delta':
      return event.text ? appendDelta(parts, 'text', event.text) : [...parts];
    case 'run.text':
      return closeBlock(parts, 'text', event.text);
    case 'run.thinking.delta':
      return appendDelta(parts, 'thinking', event.text);
    case 'run.thinking':
      return closeBlock(parts, 'thinking', event.text);
    case 'run.tool.started':
      return parts.some((part) => part.kind === 'tool' && part.toolUseId === event.toolUseId) ? [...parts] : [...parts, { kind: 'tool', toolUseId: event.toolUseId }];
    case 'run.user':
      return [...parts, { kind: 'user', id: event.id, text: event.text }];
  }
}

export function isPartEvent(event: { type: string }): event is PartEvent {
  return PART_EVENT_TYPES.has(event.type);
}

const PART_EVENT_TYPES = new Set(['run.text.delta', 'run.text', 'run.thinking.delta', 'run.thinking', 'run.tool.started', 'run.user']);

export function closeParts(parts: readonly RunPart[]): RunPart[] {
  return parts.flatMap((part): RunPart[] => {
    if (part.kind !== 'text' && part.kind !== 'thinking') return [part];
    if (!part.text) return [];
    return [{ kind: part.kind, text: part.text }];
  });
}

export function withFinalText(parts: readonly RunPart[], finalText: string): RunPart[] {
  const text = finalText.trim();
  if (!text) return [...parts];
  const texts = parts.filter((part): part is Extract<RunPart, { kind: 'text' }> => part.kind === 'text');
  if (texts.some((part) => part.text.trim() === text)) return [...parts];
  const last = texts.at(-1);
  if (last && text.startsWith(last.text.trim())) {
    const rest = text.slice(last.text.trim().length).trim();
    return rest ? [...parts, { kind: 'text', text: rest }] : [...parts];
  }
  return [...parts, { kind: 'text', text }];
}

export function partsText(parts: readonly RunPart[]): string {
  return parts
    .flatMap((part) => (part.kind === 'text' && part.text ? [part.text] : []))
    .join('\n\n');
}
