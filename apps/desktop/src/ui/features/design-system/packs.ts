import { routes } from "@design-studio/actions/pack/routes";
import type { PackSummary } from "@design-studio/contracts";
import { useEffect, useState } from "react";

import { errorText } from "../../api.js";
import { call } from "../../platform/http.js";

interface PacksState {
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

const loadPacks = async (): Promise<PackSummary[]> => {
  const pending = cached ?? listPacks();

  cached = pending;

  try {
    return await pending;
  } catch (error) {
    if (cached === pending) {
      cached = null;
    }

    throw error;
  }
};

const listeners = new Set<() => Promise<void>>();

const refreshPacks = (): void => {
  cached = null;

  for (const listener of listeners) {
    listener();
  }
};

const usePacks = (): PacksState => {
  const [state, setState] = useState<PacksState>({ error: null, packs: null });

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

    listeners.add(read);
    read();

    return (): void => {
      live = false;
      listeners.delete(read);
    };
  }, []);

  return state;
};

const pickable = (state: PacksState): PacksState => {
  if (state.packs) {
    return { ...state, packs: state.packs.filter((pack) => !pack.draft) };
  }

  return state;
};

const findPack = (
  packs: PackSummary[] | null,
  id: string | null | undefined
): PackSummary | null => {
  if (!packs || !id) {
    return null;
  }

  return packs.find((pack) => pack.id === id) ?? null;
};

const loadedFonts = new Set<string>();

const isFontLoadable = (pack: PackSummary): boolean => {
  const url = pack.fonts.googleFontsUrl;

  return Boolean(
    url &&
    !loadedFonts.has(pack.id) &&
    url.startsWith("https://fonts.googleapis.com/")
  );
};

const loadPackFonts = (packs: PackSummary[]): void => {
  const fresh = packs.filter((pack) => isFontLoadable(pack));

  for (const pack of fresh) {
    loadedFonts.add(pack.id);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = pack.fonts.googleFontsUrl ?? "";
    link.dataset.packFont = pack.id;
    document.head.append(link);
  }
};

const fontStack = (family: string, fallback: string): string => {
  const trimmed = family.trim();

  if (!trimmed) {
    return fallback;
  }

  if (trimmed.includes(",")) {
    return trimmed;
  }

  const name = (!/^['"]/u.test(trimmed) && `'${trimmed}'`) || trimmed;

  return `${name}, ${fallback}`;
};

const KEY_SWATCHES = ["primary", "accent", "fg", "bg"];

const toSwatchRank = (name: string): number => {
  const index = KEY_SWATCHES.indexOf(name);

  if (index === -1) {
    return KEY_SWATCHES.length;
  }

  return index;
};

const keySwatches = (pack: PackSummary): PackSummary["swatches"] =>
  [...pack.swatches].toSorted(
    (first, second) => toSwatchRank(first.name) - toSwatchRank(second.name)
  );

export {
  findPack,
  fontStack,
  keySwatches,
  loadPackFonts,
  pickable,
  refreshPacks,
  usePacks,
};

export type { PacksState };
