import type { ReorderMove } from './contracts.js';

export function reorderMoveOf(event: { key: string; altKey: boolean; shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }): ReorderMove | null {
  if (!event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return null;
  if (event.key === 'ArrowUp') return 'up';
  return event.key === 'ArrowDown' ? 'down' : null;
}
