import {
  isDirectionRef,
  isFrameId,
  parseCanvasFile,
} from "../../shared/canvas-file.js";
import type { CanvasPresence } from "../../shared/contracts.js";
import type {
  FrameStateDef,
  FrameStatesView,
} from "../../shared/frame-state.js";
import type {
  FlowInput,
  FlowResult,
  RouteLinksResult,
} from "../../shared/route-flow.js";
import { BadRequestError } from "../store/errors.js";
import {
  applyFrameSession,
  applyFrameState,
  readFrameStates,
} from "./app-flow/frame-state-service.js";
import {
  buildFlow,
  listRouteLinks,
  readFlowParams,
} from "./app-flow/route-flow.js";
import type { FlowDeps } from "./app-flow/route-flow.js";
import type { LinkRuntime } from "./links/link-runtime.js";
import type { CanvasSnapshot } from "./service.js";

interface CanvasDocRead {
  readonly canvas: CanvasSnapshot["canvas"];
  readonly directionId: string;
  readonly hash: CanvasSnapshot["hash"];
}

interface CanvasDocWriteQuery {
  readonly baseHash?: string | null;
  readonly canvas: unknown;
  readonly migrate?: boolean;
  readonly projectId: string;
  readonly writer?: string;
}

interface PresenceQuery {
  readonly activeFrameId: string | null;
  readonly directionId: string | null;
  readonly inView: readonly string[];
  readonly liveSize?: { readonly height: number; readonly width: number };
  readonly projectId: string;
  readonly selection: CanvasPresence["selection"];
}

interface FlowQuery {
  readonly depth?: number;
  readonly from?: string;
  readonly params?: Record<string, string>;
  readonly projectId: string;
  readonly routes?: readonly string[];
}

interface FrameStateQuery {
  readonly frame: string;
  readonly mock?: { name?: string; rules?: unknown[]; signedIn?: boolean };
  readonly projectId: string;
  readonly state: string;
}

interface FrameSessionQuery {
  readonly forget?: boolean;
  readonly projectId: string;
  readonly user?: { readonly email: string; readonly name: string };
}

interface FrameStateSet {
  readonly frameId: string;
  readonly state: FrameStateDef;
  readonly view: FrameStatesView;
}

const flowDepsOf = (runtime: LinkRuntime): FlowDeps => ({
  canvas: runtime.canvas,
  frameStates: runtime.frameStates,
  projectDir: (id) => runtime.projects.projectDir(id),
});

const readDoc = async (
  runtime: LinkRuntime,
  projectId: string
): Promise<CanvasDocRead> => {
  const project = await runtime.projects.get(projectId);
  const snapshot = await runtime.canvas.read(project);

  return {
    canvas: snapshot.canvas,
    directionId: runtime.canvas.ownerOf(project).id,
    hash: snapshot.hash,
  };
};

const writeDoc = async (
  runtime: LinkRuntime,
  query: CanvasDocWriteQuery
): Promise<CanvasDocRead> => {
  const project = await runtime.projects.get(query.projectId);
  const file = parseCanvasFile(query.canvas);

  if (!file) {
    throw new BadRequestError("canvas must be an object with a frames list");
  }

  const snapshot = await runtime.canvas.write(project, file, {
    source: query.migrate === true ? "migrate" : "user",
    ...(query.baseHash === undefined ? {} : { baseHash: query.baseHash }),
    ...(query.writer ? { writer: query.writer } : {}),
  });

  return {
    canvas: snapshot.canvas,
    directionId: runtime.canvas.ownerOf(project).id,
    hash: snapshot.hash,
  };
};

const writePresence = async (
  runtime: LinkRuntime,
  query: PresenceQuery
): Promise<Record<string, never>> => {
  const project = await runtime.projects.get(query.projectId);

  runtime.canvas.setPresence(project.id, {
    activeFrameId:
      query.activeFrameId && isFrameId(query.activeFrameId)
        ? query.activeFrameId
        : null,
    at: Date.now(),
    directionId:
      query.directionId && isDirectionRef(query.directionId)
        ? query.directionId
        : null,
    inView: query.inView.filter(isFrameId),
    ...(query.liveSize ? { liveSize: { ...query.liveSize } } : {}),
    selection: query.selection.map((item) => ({ ...item })),
  });

  return {};
};

const readFlowLinks = async (
  runtime: LinkRuntime,
  projectId: string,
  route: string
): Promise<RouteLinksResult> =>
  listRouteLinks(await runtime.projects.get(projectId), route);

const readFlowParamList = async (
  runtime: LinkRuntime,
  projectId: string
): Promise<{ params: Record<string, string> }> => ({
  params: await readFlowParams(
    flowDepsOf(runtime),
    await runtime.projects.get(projectId)
  ),
});

const flowInputOf = (query: FlowQuery): FlowInput => {
  if (!query.from && (!query.routes || query.routes.length === 0)) {
    throw new BadRequestError("pass routes or from");
  }

  return {
    ...(query.routes && query.routes.length > 0
      ? { routes: [...query.routes] }
      : {}),
    ...(query.from ? { from: query.from } : {}),
    ...(query.depth === undefined ? {} : { depth: query.depth }),
    ...(query.params ? { params: query.params } : {}),
  };
};

const writeFlow = async (
  runtime: LinkRuntime,
  query: FlowQuery
): Promise<FlowResult> => {
  const project = await runtime.projects.get(query.projectId);

  return buildFlow(
    flowDepsOf(runtime),
    project,
    runtime.canvas.ownerOf(project),
    flowInputOf(query),
    "user"
  );
};

const readStates = async (
  runtime: LinkRuntime,
  projectId: string
): Promise<FrameStatesView> =>
  readFrameStates(runtime.frameStates, await runtime.projects.get(projectId));

const writeState = async (
  runtime: LinkRuntime,
  query: FrameStateQuery
): Promise<FrameStateSet> =>
  applyFrameState(
    runtime.frameStates,
    await runtime.projects.get(query.projectId),
    {
      frame: query.frame,
      state: query.state,
      ...(query.mock ? { mock: query.mock } : {}),
    }
  );

const writeSession = async (
  runtime: LinkRuntime,
  query: FrameSessionQuery
): Promise<FrameStatesView> =>
  applyFrameSession(
    runtime.frameStates,
    await runtime.projects.get(query.projectId),
    {
      ...(query.user ? { user: query.user } : {}),
      ...(query.forget === true ? { forget: true } : {}),
    }
  );

export {
  readDoc,
  readFlowLinks,
  readFlowParamList,
  readStates,
  writeDoc,
  writeFlow,
  writePresence,
  writeSession,
  writeState,
};

export type {
  CanvasDocRead,
  CanvasDocWriteQuery,
  FlowQuery,
  FrameSessionQuery,
  FrameStateQuery,
  FrameStateSet,
  PresenceQuery,
};
