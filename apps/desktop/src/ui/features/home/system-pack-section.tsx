import type { PackSummary } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { LibraryModule } from "./lazy-parts-model.js";

interface SystemPackSectionProps {
  readonly lib: LibraryModule;
  readonly packs: PackSummary[];
  readonly value: string | null;
  readonly onPickPack: (id: string | null) => void;
}

const SystemPackSection = ({
  lib,
  packs,
  value,
  onPickPack,
}: SystemPackSectionProps): ReactElement => {
  const pick = useCallback(
    (picked: PackSummary | null): void => {
      onPickPack(picked?.id ?? null);
    },
    [onPickPack]
  );

  return (
    <section className="home-list" aria-label={copy.pickADesignSystem}>
      <p className="home-section-hint">{copy.pickOneForYourNext}</p>
      <lib.PackCards
        packs={packs}
        value={value}
        shouldIncludeNone={false}
        onPick={pick}
      />
    </section>
  );
};

export { SystemPackSection };
