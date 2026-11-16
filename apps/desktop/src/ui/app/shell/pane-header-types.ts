interface StudioPaneHeaderProps {
  name: string;
  kindLabel: string | null;
  directionName: string | null;
  connection: string;
  actionError: string | null;
  onDismissError: () => void;
  onRename: (name: string) => Promise<void>;
  onExit: () => void;
  onDuplicate: () => void;
  onTrash: () => void;
  onSettings: () => void;
}

export type { StudioPaneHeaderProps };
