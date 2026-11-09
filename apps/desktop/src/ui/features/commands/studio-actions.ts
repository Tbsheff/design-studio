import type { ColumnTab, PanelTab } from "./deps.js";

interface StudioActions {
  canRedo: boolean;
  canUndo: boolean;
  directionId: string | null;
  directions: { id: string; name: string }[];
  exportId: string | null;
  onDesignMd: () => void;
  onDirection: (id: string) => void;
  onDuplicate: () => void;
  onExport: (versionId: string) => void;
  onHome: () => void;
  onColumn: (tab: ColumnTab) => void;
  onInspector: () => void;
  onMakeStates: (() => void) | null;
  onPanel: (tab: PanelTab) => void;
  onPolish: () => void;
  onRedo: () => void;
  onSettings: () => void;
  onShip: (() => void) | null;
  onStop: () => void;
  onTrash: () => void;
  onUndo: () => void;
  running: boolean;
}

export type { StudioActions };
