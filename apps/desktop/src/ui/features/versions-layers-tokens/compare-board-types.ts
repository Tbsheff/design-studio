import type { ProjectKind, Version } from "@design-studio/contracts";

interface BoardProps {
  readonly projectId: string;
  readonly kind: ProjectKind;
  readonly older: Version;
  readonly newer: Version;
  readonly olderTitle: string;
  readonly newerTitle: string;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly scale: number;
  readonly onError: (message: string) => void;
}

interface BoardEntry {
  readonly board: BoardProps;
}

export type { BoardEntry, BoardProps };
