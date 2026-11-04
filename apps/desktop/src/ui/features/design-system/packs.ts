import { useEffect, useState } from "react";

import { routes } from "@design-studio/actions/pack/routes";
import type { PackSummary } from "@design-studio/actions/_core/contracts";
import { errorText } from "../../api.js";
import { call } from "../../platform/http.js";

export interface PacksState {
  packs: PackSummary[] | null;
  error: string | null;
}

let cached: Promise<PackSummary[]> | null = null;

const LIST_LIMIT = 200;

const listPacks = async (): Promise<PackSummary[]> => {
  const page = await call(routes.listSummaryPack, {
    cursor: null,
    limit: LIST_LIMIT,
  });

  const items: PackSummary[] = page.items;

  return items;
};

const loadPacks = (): Promise<PackSummary[]> => {
  if (!cached) {
    cached = listPacks().catch((error: unknown) => {
      cached = null;
      throw error;
    });
  }

  return cached;
};

const listeners = new Set<() => void>();

export const refreshPacks = (): void => {
  cached = null;

  for (const listener of listeners) {
    listener();
  }
};

export const usePacks = (): PacksState => {
  const [state, setState] = useState<PacksState>({ error: null, packs: null });
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
          setState({ error: null, packs });
        }
      } catch (error: unknown) {
        if (live) {
          setState({ error: errorText(error), packs: [] });
        }
      }
    };

    void read();

    return () => {
      live = false;
    };
  }, [generation]);

  return state;
};

export const pickable = (state: PacksState): PacksState =>
  state.packs
    ? { ...state, packs: state.packs.filter((pack) => !pack.draft) }
    : state;

export const findPack = (
  packs: PackSummary[] | null,
  id: string | null | undefined
): PackSummary | null => {
  if (!packs || !id) {
    return null;
  }

  return packs.find((pack) => pack.id === id) ?? null;
};

const loadedFonts = new Set<string>();

export const loadPackFonts = (packs: PackSummary[]): void => {
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
    document.head.append(link);
  }
};

export const fontStack = (family: string, fallback: string): string => {
  const trimmed = family.trim();

  if (!trimmed) {
    return fallback;
  }

  if (trimmed.includes(",")) {
    return trimmed;
  }

  const name = /^['"]/u.test(trimmed) ? trimmed : `'${trimmed}'`;

  return `${name}, ${fallback}`;
};

const KEY_SWATCHES = ["primary", "accent", "fg", "bg"];

export const keySwatches = (pack: PackSummary): PackSummary["swatches"] => {
  const rank = (name: string) => {
    const index = KEY_SWATCHES.indexOf(name);

    return index === -1 ? KEY_SWATCHES.length : index;
  };

  return [...pack.swatches].toSorted((a, b) => rank(a.name) - rank(b.name));
};
