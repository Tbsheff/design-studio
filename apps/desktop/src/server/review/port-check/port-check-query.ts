import type { McpReadStore } from "../../preview/index.js";

type PortReads = Pick<typeof McpReadStore.Service, "screenshot">;

interface PortCheckQuery {
  readonly directionId: string | null;
  readonly path: string;
  readonly projectId: string;
  readonly routePath: string;
  readonly targetProjectId: string;
  readonly width: number;
}

interface PortShotPair {
  readonly app: string;
  readonly prototype: string;
}

interface PortCheckFiles {
  readonly appPath: string;
  readonly diffPath: string;
  readonly prototypePath: string;
}

export type { PortCheckFiles, PortCheckQuery, PortReads, PortShotPair };
