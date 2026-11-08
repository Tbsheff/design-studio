import type { Version } from "@design-studio/contracts";
import type { IconName } from "@design-studio/ui";

import type { VersionIndex } from "./version-labels.js";

interface VersionRowProps {
  readonly projectId: string;
  readonly active: boolean;
  readonly version: Version;
  readonly index: VersionIndex;
  readonly isHead: boolean;
  readonly isOpen: boolean;
  readonly picked: boolean;
  readonly compareSide?: "A" | "B" | null;
  readonly locked: boolean;
  readonly expanded: boolean;
  readonly onExpand: () => void;
  readonly onOpen: () => void;
  readonly onOpenVersion: (version: Version) => void;
  readonly onRestore: () => void;
  readonly onToggleCompare: () => void;
  readonly onExport: () => void;
  readonly onBranch: () => void;
  readonly onPolish: () => void;
  readonly onRename: (name: string | null) => void;
  readonly onReview?: () => void;
}

interface MoreItem {
  readonly hint: string | null;
  readonly icon: IconName;
  readonly id: string;
  readonly label: string;
  readonly run: () => void;
}

export type { MoreItem, VersionRowProps };
