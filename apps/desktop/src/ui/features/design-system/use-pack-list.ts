import type { PackSummary } from "@design-studio/contracts";
import type { RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { toOptions } from "./pack-list-model.js";
import { findPack, loadPackFonts } from "./packs.js";
import { usePackListHandlers } from "./use-pack-list-handlers.js";
import type { PackListHandlers } from "./use-pack-list-handlers.js";

interface PackListControl extends PackListHandlers {
  readonly active: number;
  readonly list: RefObject<HTMLDivElement | null>;
  readonly options: (PackSummary | null)[];
  readonly selected: PackSummary | null;
}

const usePackListEffects = (
  packs: PackSummary[] | null,
  active: number,
  list: RefObject<HTMLDivElement | null>
): void => {
  const isReady = packs !== null;

  useEffect(() => {
    if (packs) {
      loadPackFonts(packs);
    }
  }, [packs]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    list.current?.parentElement?.scrollIntoView({ block: "nearest" });

    const card = list.current?.children[active];

    if (card instanceof HTMLElement) {
      card.focus({ preventScroll: false });
    }
  }, [active, isReady, list]);
};

const usePackList = ({
  includeNone,
  onChoose,
  onTab,
  packs,
  value,
}: {
  includeNone: boolean;
  onChoose: (pack: PackSummary | null) => void;
  onTab: (() => void) | null;
  packs: PackSummary[] | null;
  value: string | null;
}): PackListControl => {
  const options = useMemo(
    () => toOptions(packs, includeNone),
    [packs, includeNone]
  );

  const selected = findPack(packs, value);
  const [active, setActive] = useState(0);
  const [isSynced, setIsSynced] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const isReady = packs !== null;

  const selectedIndex = options.findIndex(
    (pack) => (pack?.id ?? null) === (selected?.id ?? null)
  );

  if (isReady && !isSynced) {
    setIsSynced(true);
    setActive(Math.max(0, selectedIndex));
  }

  usePackListEffects(packs, active, list);

  const handlers = usePackListHandlers({
    active,
    list,
    onChoose,
    onTab,
    options,
    setActive,
  });

  return { ...handlers, active, list, options, selected };
};

export { usePackList };

export type { PackListControl };
