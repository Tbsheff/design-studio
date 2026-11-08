import type { Project, Version } from "@design-studio/contracts";

interface VersionsPanelProps {
  readonly project: Project;
  readonly directionId: string | null;
  readonly versions: Version[];
  readonly busy: boolean;
  readonly running: boolean;
  readonly compare: string[];
  readonly openVersionId: string | null;
  readonly onSelectDirection: (id: string) => void;
  readonly onNewDirection: (
    fromVersionId: string,
    name: string
  ) => Promise<void>;
  readonly onOpen: (version: Version, title: string) => void;
  readonly onRestore: (version: Version) => void;
  readonly onUndo: () => void;
  readonly onExport: (version: Version) => void;
  readonly onToggleCompare: (version: Version) => void;
  readonly onCompare: () => void;
  readonly onPolish: () => void;
  readonly onReview?: (version: Version) => void;
  readonly active?: boolean;
  readonly onRename?: (version: Version, name: string | null) => Promise<void>;
}

export type { VersionsPanelProps };
