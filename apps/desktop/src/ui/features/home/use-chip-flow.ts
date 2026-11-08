import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

import { useAppChip } from "./use-app-chip.js";
import type { AppChipState } from "./use-app-chip.js";
import { useChipFolder } from "./use-chip-folder.js";
import type { ChipFolder } from "./use-chip-folder.js";
import { useChipOpen } from "./use-chip-open.js";
import type { ChipOpen, ChipOpenDeps } from "./use-chip-open.js";

type ChipFlowDeps = Omit<ChipOpenDeps, "chip">;

interface ChipFlow extends ChipFolder, ChipOpen {
  readonly app: AppChipState;
  readonly isAppMenuOpen: boolean;
  readonly setIsAppMenuOpen: Dispatch<SetStateAction<boolean>>;
}

const useChipFlow = (deps: ChipFlowDeps): ChipFlow => {
  const app = useAppChip();
  const [isAppMenuOpen, setIsAppMenuOpen] = useState(false);
  const [wasPicking, setWasPicking] = useState(false);
  const folder = useChipFolder(app, deps.setFormError);
  const open = useChipOpen({ ...deps, chip: app.chip });

  const needsPick =
    (app.chip?.inspection?.candidates.length ?? 0) > 1 &&
    (app.chip?.appDir ?? null) === null;

  if (needsPick !== wasPicking) {
    setWasPicking(needsPick);

    if (needsPick) {
      setIsAppMenuOpen(true);
    }
  }

  return { ...folder, ...open, app, isAppMenuOpen, setIsAppMenuOpen };
};

export { useChipFlow };

export type { ChipFlow, ChipFlowDeps };
