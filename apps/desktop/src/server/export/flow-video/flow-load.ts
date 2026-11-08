import type { Input } from "@design-studio/actions/_core/action";
import type { exportFlowCanvas } from "@design-studio/actions/canvas/export-flow";
import type { Direction, Project } from "@design-studio/contracts";

import { BadRequestError, NotFoundError } from "../../platform/errors/index.js";
import { withPagePath } from "../../project-source/index.js";
import { CaptureUnavailableError } from "../../state-styles/index.js";
import type { ExportRuntime } from "../export-core.js";
import { toFlowLinks } from "./engine/index.js";
import type { FlowLink, FlowLinksDocument } from "./engine/index.js";

type FlowRequest = Input<typeof exportFlowCanvas>;

interface FlowFrameInfo {
  readonly height: number;
  readonly id: string;
  readonly path: string | null;
  readonly width: number;
}

interface FlowTarget {
  readonly baseUrl: string;
  readonly direction: Direction;
  readonly document: FlowLinksDocument;
  readonly frames: readonly FlowFrameInfo[];
  readonly links: readonly FlowLink[];
  readonly project: Project;
  readonly projectDir: string;
}

const NO_CANVAS = "The canvas is not ready. Open the project and try again.";

const NO_FRAMES = "This project has no frames to record.";

const getDirection = (
  project: Project,
  directionId: string | null
): Direction => {
  if (directionId === null) {
    const main =
      project.directions.find((direction) => direction.id === "main") ??
      project.directions[0] ??
      null;

    if (main === null) {
      throw new NotFoundError(`Project ${project.id} has no directions.`);
    }

    return main;
  }

  const found =
    project.directions.find((direction) => direction.id === directionId) ??
    null;

  if (found === null) {
    throw new NotFoundError(`Direction ${directionId} was not found.`);
  }

  return found;
};

const toFrameUrl = (baseUrl: string, frame: FlowFrameInfo): string =>
  withPagePath(baseUrl, frame.path ?? "");

const toFrameInfos = (
  frames: readonly {
    readonly height: number;
    readonly hidden?: boolean;
    readonly id: string;
    readonly order: number;
    readonly path?: string;
    readonly width: number;
  }[]
): readonly FlowFrameInfo[] =>
  frames
    .filter((frame) => frame.hidden !== true)
    .toSorted((left, right) => left.order - right.order)
    .map((frame) => ({
      height: frame.height,
      id: frame.id,
      path: frame.path ?? null,
      width: frame.width,
    }));

const getFlowTarget = async (
  runtime: ExportRuntime,
  request: FlowRequest
): Promise<FlowTarget> => {
  const { canvas } = runtime;

  if (canvas === null) {
    throw new CaptureUnavailableError(NO_CANVAS);
  }

  const loaded = await runtime.projects.get(request.projectId);
  const picked = getDirection(loaded, request.directionId);

  const [snapshot, file] = await Promise.all([
    canvas.read(loaded),
    canvas.links.read(loaded),
  ]);

  const infos = toFrameInfos(snapshot.canvas?.frames ?? []);

  if (infos.length === 0) {
    throw new BadRequestError(NO_FRAMES);
  }

  const linkDocument: FlowLinksDocument = {
    links: file.links,
    start: file.start ?? null,
  };

  return {
    baseUrl: await runtime.preview.directionUrl(loaded, picked),
    direction: picked,
    document: linkDocument,
    frames: infos,
    links: toFlowLinks(linkDocument),
    project: loaded,
    projectDir: runtime.projects.projectDir(loaded.id),
  };
};

export { getFlowTarget, toFrameUrl };

export type { FlowFrameInfo, FlowRequest, FlowTarget };
