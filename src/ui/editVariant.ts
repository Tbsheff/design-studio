import { createContext, useContext, useSyncExternalStore } from 'react';
import type { DirectStyleProperty } from '../shared/contracts';
import { parseVariant } from '../shared/variants';
import type { PreviewPort } from './bridge';
import { uiStore } from './storage';

let prefix = '';
let restore: { width: number; set: number } | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export const editVariantStore = {
  get: (): string => prefix,
  set: (next: string): void => {
    if (next === prefix) return;
    prefix = next;
    emit();
  },
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useEditVariant(): string {
  return useSyncExternalStore(editVariantStore.subscribe, editVariantStore.get);
}

export function fitFrameTo(width: number | null): void {
  const viewport = uiStore.get().viewport;
  if (width === null) {
    if (restore && viewport.width === restore.set) uiStore.set({ viewport: { preset: 'custom', width: restore.width, height: viewport.height } });
    restore = null;
    return;
  }
  if (!restore || viewport.width !== restore.set) restore = { width: viewport.width, set: width };
  else restore = { ...restore, set: width };
  if (viewport.width !== width) uiStore.set({ viewport: { preset: 'custom', width, height: viewport.height } });
}

export function postForceState(port: PreviewPort | null, selector: string | null, variant: string): void {
  const parsed = parseVariant(variant);
  const states = parsed?.states ?? [];
  const dark = parsed?.dark ?? false;
  port?.post({ type: 'force-state', selector, states, dark, track: selector !== null && variant !== '' });
}

export function resetEditVariant(port: PreviewPort | null): void {
  if (prefix === '') return;
  editVariantStore.set('');
  fitFrameTo(null);
  postForceState(port, null, '');
}

export interface VariantScope {
  prefix: string;
  props: ReadonlySet<string>;
}

export const VariantScopeContext = createContext<VariantScope>({ prefix: '', props: new Set() });

export function useInherited(prop: DirectStyleProperty): boolean {
  const scope = useContext(VariantScopeContext);
  return scope.prefix !== '' && !scope.props.has(prop);
}
