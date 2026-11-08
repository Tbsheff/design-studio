import type { DesignSystemState, PackSummary } from "@design-studio/contracts";

import type { DesignSystemRef } from "./design-system-ref.js";

type ChipDialog = "change" | "save" | null;

interface TokenLoad {
  readonly error: string | null;
  readonly state: DesignSystemState | null;
}

const toChipName = (
  system: DesignSystemRef,
  pack: PackSummary | null,
  load: TokenLoad
): string => {
  const loaded = load.state?.manifest?.name ?? system.packId;

  return system.name ?? pack?.name ?? loaded ?? "";
};

const toBadgeText = (pack: PackSummary | null): string => {
  if (pack?.source === "user") {
    return "Yours";
  }

  return "Read-only";
};

export { toBadgeText, toChipName };

export type { ChipDialog, TokenLoad };
