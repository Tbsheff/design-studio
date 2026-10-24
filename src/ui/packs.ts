import { useEffect, useState } from 'react';
import type { PackSummary } from '../shared/contracts';
import { api, errorText } from './api';

export interface PacksState {
  packs: PackSummary[] | null;
  error: string | null;
}

let cached: Promise<PackSummary[]> | null = null;

function loadPacks(): Promise<PackSummary[]> {
  if (!cached) {
    cached = api.listPacks().catch((err: unknown) => {
      cached = null;
      throw err;
    });
  }
  return cached;
}

const listeners = new Set<() => void>();

export function refreshPacks(): void {
  cached = null;
  for (const listener of listeners) listener();
}

export function usePacks(): PacksState {
  const [state, setState] = useState<PacksState>({ packs: null, error: null });
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    const listener = () => setGeneration((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  useEffect(() => {
    let live = true;
    loadPacks()
      .then((packs) => live && setState({ packs, error: null }))
      .catch((err) => live && setState({ packs: [], error: errorText(err) }));
    return () => {
      live = false;
    };
  }, [generation]);
  return state;
}

export function findPack(packs: PackSummary[] | null, id: string | null | undefined): PackSummary | null {
  if (!packs || !id) return null;
  return packs.find((pack) => pack.id === id) ?? null;
}

const loadedFonts = new Set<string>();

export function loadPackFonts(packs: PackSummary[]): void {
  for (const pack of packs) {
    const url = pack.fonts.googleFontsUrl;
    if (!url || loadedFonts.has(pack.id) || !/^https:\/\/fonts\.googleapis\.com\//.test(url)) continue;
    loadedFonts.add(pack.id);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.dataset.packFont = pack.id;
    document.head.appendChild(link);
  }
}

export function fontStack(family: string, fallback: string): string {
  const trimmed = family.trim();
  if (!trimmed) return fallback;
  if (trimmed.includes(',')) return trimmed;
  const name = /^['"]/.test(trimmed) ? trimmed : `'${trimmed}'`;
  return `${name}, ${fallback}`;
}

const KEY_SWATCHES = ['primary', 'accent', 'fg', 'bg'];

export function keySwatches(pack: PackSummary): PackSummary['swatches'] {
  const rank = (name: string) => {
    const index = KEY_SWATCHES.indexOf(name);
    return index === -1 ? KEY_SWATCHES.length : index;
  };
  return [...pack.swatches].sort((a, b) => rank(a.name) - rank(b.name));
}
