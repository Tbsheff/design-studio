import type { AgentRunContext } from "../../shared/server-ports.js";
import { isPathLocked } from "../platform/path-lock/index.js";

const FOCUS_PATH_MESSAGE =
  "This run is limited to the focus files. This file is outside them.";

const isOutsideFocus = (globs: readonly string[], relative: string): boolean =>
  globs.length > 0 && !isPathLocked(globs, relative);

interface GateLists {
  readonly focusPaths: string[];
  readonly lockedPaths: string[];
}

const toGateLists = (
  ctx: Pick<AgentRunContext, "lockedPaths" | "request">
): GateLists => ({
  focusPaths: ctx.request.focusPaths ?? [],
  lockedPaths: ctx.lockedPaths ?? [],
});

export { FOCUS_PATH_MESSAGE, isOutsideFocus, toGateLists };
