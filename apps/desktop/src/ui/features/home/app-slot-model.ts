import type { AppChip } from "./app-chip-model.js";

interface AppSlotProps {
  readonly chip: AppChip | null;
  readonly onAddFolder: () => void;
  readonly onDoctor: () => void;
}

export type { AppSlotProps };
