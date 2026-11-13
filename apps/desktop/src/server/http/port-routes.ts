import {
  cleanPortRoute,
  PORT_FLOW_MAX_PAGES,
} from "@design-studio/contracts/port";

import {
  buildFlowPlan,
  buildPortPlan,
  sourcePagePath,
  toPortPlanInput,
} from "../agent/index.js";
import type { PortStartDeps } from "../agent/index.js";
import { BadRequestError, assertSafeId } from "../platform/errors/index.js";
import { bindMcpReadRuntime } from "../preview/mcp-read-core.js";

export interface PortRouteDeps {
  projects: PortStartDeps["projects"];
}

interface PortQuery {
  sourceProjectId: string;
  sourceDirectionId: string | null;
  path: string;
  paths: string[] | null;
  flow: boolean;
  targetProjectId: string | null;
  route: string | null;
}

function text(raw: unknown): string | null {
  return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
}

function parseRoute(raw: unknown): string | null {
  const value = text(raw);

  if (value === null) {
    return null;
  }

  const route = cleanPortRoute(value);

  if (!route) {
    throw new BadRequestError(
      "route must be an app path like /classes or /(design)/classes: lower-case letters, digits and dashes"
    );
  }

  return route;
}

function parsePaths(raw: unknown): string[] | null {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(",")
      : [];

  const paths = [
    ...new Set(
      list
        .map(text)
        .filter((item): item is string => item !== null)
        .map(sourcePagePath)
    ),
  ];

  if (paths.length > PORT_FLOW_MAX_PAGES) {
    throw new BadRequestError(
      `paths can list at most ${PORT_FLOW_MAX_PAGES} pages`
    );
  }

  return paths.length > 0 ? paths : null;
}

function parseQuery(raw: Readonly<Record<string, unknown>>): PortQuery {
  const sourceProjectId = text(raw.sourceProjectId);

  if (!sourceProjectId) {
    throw new BadRequestError("sourceProjectId is required");
  }

  const sourceDirectionId = text(raw.sourceDirectionId);
  const targetProjectId = text(raw.targetProjectId);
  const paths = parsePaths(raw.paths);

  return {
    sourceProjectId: assertSafeId(sourceProjectId, "sourceProjectId"),
    sourceDirectionId:
      sourceDirectionId === null
        ? null
        : assertSafeId(sourceDirectionId, "sourceDirectionId"),
    path: sourcePagePath(text(raw.path) ?? ""),
    paths,
    flow: raw.flow === true || raw.flow === "true" || raw.flow === "1",
    targetProjectId:
      targetProjectId === null
        ? null
        : assertSafeId(targetProjectId, "targetProjectId"),
    route: parseRoute(raw.route),
  };
}

export function registerPortRoutes(deps: PortRouteDeps): void {
  bindMcpReadRuntime({
    planPort: async (raw) => {
      const query = parseQuery(Object.fromEntries(Object.entries(raw)));
      const input = await toPortPlanInput(deps.projects, query);

      return query.flow || query.paths
        ? buildFlowPlan({ ...input, paths: query.paths })
        : buildPortPlan(input);
    },
  });
}
