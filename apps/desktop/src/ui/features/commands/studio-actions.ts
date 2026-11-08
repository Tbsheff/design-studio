import type { PanelTab } from "./deps.js";

interface StudioActions {
  canRedo: boolean;
  canUndo: boolean;
  directionId: string | null;
  directions: { id: string; name: string }[];
  exportId: string | null;
  onDesignMd: () => void;
  onDirection: (id: string) => void;
  onExport: (versionId: string) => void;
  onHome: () => void;
  onMakeStates: (() => void) | null;
  onPanel: (tab: PanelTab) => void;
  onPolish: () => void;
  onRedo: () => void;
  onSettings: () => void;
  onShip: (() => void) | null;
  onStop: () => void;
  onUndo: () => void;
  running: boolean;
}

export type { StudioActions };
