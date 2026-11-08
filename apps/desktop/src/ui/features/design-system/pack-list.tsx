import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement, ReactNode } from "react";

import { Swatches } from "../inspector/swatches.js";
import { COPY } from "./copy.js";
import { PackCheck } from "./pack-check.js";
import { PackFace } from "./pack-face.js";
import { toCardClass, toOptionLabel, toPackKey } from "./pack-list-model.js";
import { PackListSkeleton } from "./pack-list-skeleton.js";
import { usePackList } from "./use-pack-list.js";

const SWATCH_MAX = 7;

const isSelectedPack = (
  pack: PackSummary | null,
  selected: PackSummary | null
): boolean => (pack?.id ?? null) === (selected?.id ?? null);

const toSwatches = (pack: PackSummary | null): ReactNode => {
  if (!pack) {
    return null;
  }

  return <Swatches swatches={pack.swatches} max={SWATCH_MAX} />;
};

const toTabIndex = (index: number, active: number): number => {
  if (index === active) {
    return 0;
  }

  return -1;
};

interface ListProps {
  includeNone: boolean;
  onChoose: (pack: PackSummary | null) => void;
  onTab: (() => void) | null;
  packs: PackSummary[] | null;
  value: string | null;
}

const PackList = ({
  includeNone,
  onChoose,
  onTab,
  packs,
  value,
}: ListProps): ReactElement => {
  const control = usePackList({
    includeNone,
    onChoose,
    onTab,
    packs,
    value,
  });

  const { active, list, onClick, onHover, onKey, options, selected } = control;

  return (
    <div
      ref={list}
      className="pack-list"
      role="menu"
      tabIndex={-1}
      aria-label={COPY.labelDesignSystems}
      onKeyDown={onKey}
      onClick={onClick}
      onMouseMove={onHover}
    >
      {options.map((pack, index) => (
        <div
          key={toPackKey(pack)}
          role="menuitemradio"
          data-index={index}
          aria-label={toOptionLabel(pack)}
          aria-checked={isSelectedPack(pack, selected)}
          tabIndex={toTabIndex(index, active)}
          className={toCardClass(isSelectedPack(pack, selected))}
        >
          <PackFace pack={pack}>{toSwatches(pack)}</PackFace>
          <PackCheck isSelected={isSelectedPack(pack, selected)} />
        </div>
      ))}
      <PackListSkeleton isShown={packs === null} />
    </div>
  );
};

export { PackList };
