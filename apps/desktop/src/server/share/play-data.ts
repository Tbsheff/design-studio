import type { Project } from "@design-studio/contracts";
import type { CanvasFileFrame } from "@design-studio/contracts/canvas-file";
import { emptyLinksFile } from "@design-studio/contracts/links";
import type { ShareFrame } from "@design-studio/contracts/share";
import type {
  SharePlayData,
  SharePlayFrame,
} from "@design-studio/contracts/share-play";

import { readProjectCanvas, toPlayLinks } from "../canvas/index.js";
import type { ShareRecord } from "./store.js";

interface PlayDataDeps {
  readonly projectDir: (projectId: string) => string;
}

const FRAME_GAP = 80;

const toCanvasFrames = async (
  deps: PlayDataDeps,
  project: Project
): Promise<readonly CanvasFileFrame[]> => {
  try {
    const read = await readProjectCanvas(project, deps.projectDir);

    return read?.canvas?.frames ?? [];
  } catch {
    return [];
  }
};

const toLabel = (found: CanvasFileFrame | null, shared: ShareFrame): string => {
  const label = found?.label?.trim() ?? "";

  if (label === "") {
    return shared.name;
  }

  return label;
};

const toSharedFrame = (
  shared: ShareFrame,
  position: number,
  found: CanvasFileFrame | null
): SharePlayFrame => ({
  height: found?.height ?? shared.height,
  id: found?.id ?? shared.id ?? `f${position + 1}`,
  index: position,
  label: toLabel(found, shared),
  left: found?.x ?? position * (shared.width + FRAME_GAP),
  path: found?.path ?? shared.path ?? null,
  top: found?.y ?? 0,
  width: found?.width ?? shared.width,
});

const toPlayFrames = (
  record: ShareRecord,
  canvas: readonly CanvasFileFrame[]
): SharePlayFrame[] =>
  record.frames.map((shared, index) => {
    const found = canvas.find((frame) => frame.id === shared.id) ?? null;

    return toSharedFrame(shared, index, found);
  });

const toLinksOrEmpty = async (
  projectId: string
): Promise<Pick<SharePlayData, "implicit" | "links">> => {
  try {
    const found = await toPlayLinks(projectId);

    if (found !== null) {
      return found;
    }
  } catch {
    return { implicit: [], links: emptyLinksFile() };
  }

  return { implicit: [], links: emptyLinksFile() };
};

const toPlayData = async (
  deps: PlayDataDeps,
  project: Project,
  record: ShareRecord
): Promise<SharePlayData> => {
  const [canvas, linked] = await Promise.all([
    toCanvasFrames(deps, project),
    toLinksOrEmpty(project.id),
  ]);

  return {
    expiresAt: record.expiresAt,
    frames: toPlayFrames(record, canvas),
    implicit: linked.implicit,
    isLive: record.live === true,
    links: linked.links,
    rev: record.rev ?? 0,
    title: record.title,
  };
};

const isPlayable = (project: Project): boolean =>
  project.kind === "html" && !project.app;

export { isPlayable, toPlayData };

export type { PlayDataDeps };
