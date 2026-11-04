import type { TaggedGroup } from "./group.js";
import { toAuthKind } from "./group.js";
import { isPublicRoute } from "./public-routes.js";

interface AuditEndpoint {
  readonly method: string;
  readonly middlewares?: ReadonlySet<unknown>;
  readonly name: string;
  readonly path: string;
}

interface AuditGroup extends TaggedGroup {
  readonly endpoints: Record<string, AuditEndpoint>;
  readonly identifier: string;
}

interface AuditApi {
  readonly groups: Record<string, AuditGroup>;
}

const findEndpointProblem = (
  group: AuditGroup,
  endpoint: AuditEndpoint
): string | null => {
  const label = `${endpoint.method} ${endpoint.path}`;
  const kind = toAuthKind(group);

  if (kind === null) {
    return `${label}: group ${group.identifier} has no auth kind`;
  }

  if (kind === "public") {
    if (isPublicRoute(endpoint.method, endpoint.path)) {
      return null;
    }

    return `${label}: public route is not in the allowlist`;
  }

  if ((endpoint.middlewares?.size ?? 0) > 0) {
    return null;
  }

  return `${label}: no auth middleware`;
};

const findProblems = (api: AuditApi): readonly string[] => {
  const groups = Object.values(api.groups);

  const problems = groups.flatMap((group) =>
    Object.values(group.endpoints).map((endpoint) =>
      findEndpointProblem(group, endpoint)
    )
  );

  const found = problems.filter((problem) => problem !== null);

  if (groups.length === 0) {
    return ["api has no groups", ...found];
  }

  return found;
};

const auditRoutes = (api: AuditApi): void => {
  const problems = findProblems(api);

  if (problems.length > 0) {
    throw new Error(`route audit failed:\n${problems.join("\n")}`);
  }
};

export { auditRoutes, findProblems };

export type { AuditApi, AuditEndpoint, AuditGroup };
