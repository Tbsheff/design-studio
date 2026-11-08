import type { PanelTab } from "../../platform/use-panel-tab";

interface StudioPaneHeaderProps {
  name: string;
  kindLabel: string;
  directionName: string | null;
  connection: string;
  actionError: string | null;
  onDismissError: () => void;
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  hasTokens: boolean;
  hasComponents: boolean;
  hasTweaks: boolean;
  commentCount: number;
  onRename: (name: string) => Promise<void>;
  onExit: () => void;
  onToggleRail: () => void;
  railOpen: boolean;
  onDesignMd: () => void;
  onSettings: () => void;
  onCollapse: () => void;
}

export type { StudioPaneHeaderProps };
