import { useEffect, useState } from "react";

import { routes } from "../shared/actions/pack/routes.js";
import type { PackSummary } from "../shared/contracts";
import { errorText } from "./api";
import { call } from "./platform/http";

export interface PacksState {
  packs: PackSummary[] | null;
  error: string | null;
}

let cached: Promise<PackSummary[]> | null = null;

const LIST_LIMIT = 200;

async function listPacks(): Promise<PackSummary[]> {
  const page = await call(routes.listSummaryPack, {
    cursor: null,
    limit: LIST_LIMIT,
  });

  const items: PackSummary[] = page.items;

  return items;
}

function loadPacks(): Promise<PackSummary[]> {
  if (!cached) {
    cached = listPacks().catch((err: unknown) => {
      cached = null;
      throw err;
    });
  }

  return cached;
}

const listeners = new Set<() => void>();

export function refreshPacks(): void {
  cached = null;

  for (const listener of listeners) {
    listener();
  }
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

    const read = async (): Promise<void> => {
      try {
        const packs = await loadPacks();

        if (live) {
          setState({ packs, error: null });
        }
      } catch (err: unknown) {
        if (live) {
          setState({ packs: [], error: errorText(err) });
        }
      }
    };

    void read();

    return () => {
      live = false;
    };
  }, [generation]);

  return state;
}

export function pickable(state: PacksState): PacksState {
  return state.packs
    ? { ...state, packs: state.packs.filter((pack) => !pack.draft) }
    : state;
}

export function findPack(
  packs: PackSummary[] | null,
  id: string | null | undefined
): PackSummary | null {
  if (!packs || !id) {
    return null;
  }

  return packs.find((pack) => pack.id === id) ?? null;
}

const loadedFonts = new Set<string>();

export function loadPackFonts(packs: PackSummary[]): void {
  for (const pack of packs) {
    const url = pack.fonts.googleFontsUrl;

    if (
      !url ||
      loadedFonts.has(pack.id) ||
      !url.startsWith("https://fonts.googleapis.com/")
    ) {
      continue;
    }

    loadedFonts.add(pack.id);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.dataset.packFont = pack.id;
    document.head.appendChild(link);
  }
}

export function fontStack(family: string, fallback: string): string {
  const trimmed = family.trim();

  if (!trimmed) {
    return fallback;
  }

  if (trimmed.includes(",")) {
    return trimmed;
  }

  const name = /^['"]/.test(trimmed) ? trimmed : `'${trimmed}'`;

  return `${name}, ${fallback}`;
}

const KEY_SWATCHES = ["primary", "accent", "fg", "bg"];

export function keySwatches(pack: PackSummary): PackSummary["swatches"] {
  const rank = (name: string) => {
    const index = KEY_SWATCHES.indexOf(name);

    return index === -1 ? KEY_SWATCHES.length : index;
  };

  return [...pack.swatches].sort((a, b) => rank(a.name) - rank(b.name));
}
