import type { ProjectKind } from "@design-studio/contracts";

interface PlusMenuActions {
  readonly onAttachFile: () => void;
  readonly onAttachFolder: () => void;
  readonly onAttachUrl: () => void;
  readonly onAttachZip: () => void;
  readonly onImportRepo: () => void;
  readonly onLinkCode: () => void;
  readonly kind: ProjectKind | null;
  readonly onKind: (kind: ProjectKind) => void;
}

export type { PlusMenuActions };
