import type { McpReadStore } from "../../preview/index.js";
import type { MaskProbe } from "./port-mask-probe.js";

type PortReads = Pick<
  typeof McpReadStore.Service,
  "fileText" | "probedScreenshot" | "screenshot"
>;

interface PortRouteUpdate {
  readonly diffs: readonly string[];
}

interface PortCheckQuery {
  readonly directionId: string | null;
  readonly isSourced: boolean;
  readonly limit: number;
  readonly path: string;
  readonly projectId: string;
  readonly routePath: string;
  readonly targetProjectId: string;
  readonly update: PortRouteUpdate | null;
  readonly width: number;
}

interface PortShot {
  readonly data: string;
  readonly probe: MaskProbe;
}

interface PortShotPair {
  readonly app: PortShot;
  readonly prototype: PortShot;
}

interface PortCheckFiles {
  readonly appPath: string;
  readonly diffPath: string;
  readonly prototypePath: string;
}

export type {
  PortCheckFiles,
  PortCheckQuery,
  PortReads,
  PortRouteUpdate,
  PortShot,
  PortShotPair,
};
