import type {
  CanvasPresence,
  CanvasWriteSource,
  Direction,
  Project,
} from "@design-studio/contracts";
import type {
  CanvasFile,
  LayoutChange,
} from "@design-studio/contracts/canvas-file";
import type { LinksFile } from "@design-studio/contracts/links";

type CanvasLayoutListener = (
  project: Project,
  change: LayoutChange,
  source: CanvasWriteSource
) => void;

interface LinksService {
  read: (project: Project) => Promise<LinksFile>;
  update: (
    project: Project,
    change: (file: LinksFile) => LinksFile | null,
    source: CanvasWriteSource
  ) => Promise<LinksFile>;
  announce: (project: Project) => Promise<void>;
}

interface CanvasSnapshot {
  canvas: CanvasFile | null;
  hash: string | null;
}

interface CanvasWrite {
  source: CanvasWriteSource;
  writer?: string;
  baseHash?: string | null;
}

interface CanvasService {
  ownerOf: (project: Project) => Direction;
  read: (project: Project) => Promise<CanvasSnapshot>;
  write: (
    project: Project,
    canvas: CanvasFile,
    write: CanvasWrite
  ) => Promise<CanvasSnapshot>;
  update: (
    project: Project,
    change: (canvas: CanvasFile) => CanvasFile | null,
    write: CanvasWrite
  ) => Promise<CanvasSnapshot>;
  announce: (project: Project) => Promise<void>;
  setPresence: (projectId: string, presence: CanvasPresence) => void;
  presence: (projectId: string) => CanvasPresence | null;
  point: (project: Project, frameId: string, selector?: string) => void;
  onLayoutChange?: (listener: CanvasLayoutListener) => void;
  links: LinksService;
}

export type { CanvasService, CanvasSnapshot, CanvasWrite, LinksService };
