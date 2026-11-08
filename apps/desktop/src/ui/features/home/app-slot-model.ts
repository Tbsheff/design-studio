import type { RefObject } from "react";

import type { AppChip } from "./app-chip-model.js";
import type { Pop } from "./home-model.js";

interface AppSlotProps {
  readonly chip: AppChip | null;
  readonly pop: Pop;
  readonly folderRef: RefObject<HTMLButtonElement | null>;
  readonly onAddFolder: () => void;
  readonly onDoctor: () => void;
}

export type { AppSlotProps };
