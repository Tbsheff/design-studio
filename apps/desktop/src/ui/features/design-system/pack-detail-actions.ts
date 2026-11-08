import type { PackSummary } from "@design-studio/contracts";

interface PackDetailActions {
  onRename: (pack: PackSummary) => void;
  onDuplicate: (pack: PackSummary) => Promise<void>;
  onDelete: (pack: PackSummary) => void;
  onExport: (pack: PackSummary) => Promise<void>;
  onOpenEditor: (pack: PackSummary) => Promise<void>;
  onUseInNew: (pack: PackSummary) => void;
  onApply: ((pack: PackSummary) => Promise<void>) | null;
}

export type { PackDetailActions };
