import type { ClassChange } from '../../shared/contracts.js';

export const MAX_CLASS_NAMES = 30;
export const MAX_CLASS_NAME = 100;
export const CLASS_NAME = /^[A-Za-z0-9_:/[\]().%#!@&=,*+-]+$/;

export function hasClassChange(change: ClassChange | undefined): change is ClassChange {
  return change !== undefined && ((change.add?.length ?? 0) > 0 || (change.remove?.length ?? 0) > 0);
}

export function nextClassList(current: string, change: ClassChange): string {
  const removed = new Set(change.remove ?? []);
  const kept = current.split(/\s+/).filter((name) => name !== '' && !removed.has(name));
  for (const name of change.add ?? []) if (!kept.includes(name)) kept.push(name);
  return kept.join(' ');
}
