import { access } from "node:fs/promises";
import path from "node:path";

import type { AgentRunContext } from "../../shared/server-ports.js";

type NewPageContext = Pick<
  AgentRunContext,
  "direction" | "project" | "request" | "target"
>;

const isFilePresent = async (file: string): Promise<boolean> => {
  try {
    await access(file);

    return true;
  } catch {
    return false;
  }
};

const isPlainProject = (ctx: NewPageContext): boolean =>
  !ctx.project.app && !ctx.project.designSystemFor;

const isPlainRequest = (ctx: NewPageContext): boolean =>
  ctx.request.mode === "edit" &&
  !ctx.request.task &&
  (ctx.request.selection ?? []).length === 0;

const isPlainEditRun = (ctx: NewPageContext): boolean =>
  isPlainProject(ctx) && isPlainRequest(ctx);

const isBlankTemplate = (ctx: NewPageContext): boolean =>
  ctx.direction.headVersionId === null &&
  (ctx.project.imported === null || ctx.project.imported.created === true);

const toTargetFile = (ctx: NewPageContext): string =>
  ctx.target?.routeFile ?? ctx.project.entry;

const isNewPageRun = async (ctx: NewPageContext): Promise<boolean> => {
  if (!isPlainEditRun(ctx)) {
    return false;
  }

  if (ctx.project.kind === "react") {
    return isBlankTemplate(ctx);
  }

  return !(await isFilePresent(
    path.join(ctx.direction.workTree, toTargetFile(ctx))
  ));
};

export { isNewPageRun };
