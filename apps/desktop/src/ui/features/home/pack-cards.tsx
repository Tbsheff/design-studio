import type { PackSummary } from "@design-studio/contracts";
import { useCallback, useEffect } from "react";
import type { ReactElement } from "react";

import { NoneCard } from "./none-card.js";
import { toPackVars } from "./pack-face-model.js";
import { PackPreviewCard } from "./pack-preview-card.js";
import { fontStack, loadPackFonts } from "./use-home-screen.js";

interface PackCardsProps {
  readonly packs: PackSummary[];
  readonly value: string | null;
  readonly shouldIncludeNone: boolean;
  readonly onPick: (pack: PackSummary | null) => void;
}

const PackCards = ({
  packs,
  value,
  shouldIncludeNone,
  onPick,
}: PackCardsProps): ReactElement => {
  useEffect(() => loadPackFonts(packs), [packs]);

  const pickNone = useCallback((): void => {
    onPick(null);
  }, [onPick]);

  return (
    <div className="home-pack-grid">
      {shouldIncludeNone && (
        <NoneCard isSelected={value === null} onPick={pickNone} />
      )}
      {packs.map((pack) => (
        <PackPreviewCard
          key={pack.id}
          pack={pack}
          isSelected={pack.id === value}
          faceStyle={toPackVars(pack, fontStack)}
          onPick={onPick}
        />
      ))}
    </div>
  );
};

export { PackCards };
