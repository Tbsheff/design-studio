import { access } from "node:fs/promises";
import path from "node:path";

import { TOKENS_FILE } from "@design-studio/contracts";

import type { AgentRunContext } from "../../shared/server-ports.js";
import { isLeanRun } from "./lean-run.js";

type NewPageContext = Pick<
  AgentRunContext,
  "direction" | "project" | "request" | "target"
>;

type StarterLookContext = NewPageContext &
  Pick<AgentRunContext, "designSystem">;

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

const toTargetFile = (ctx: NewPageContext): string =>
  ctx.target?.routeFile ?? ctx.project.entry;

const isNewPageRun = async (ctx: NewPageContext): Promise<boolean> => {
  if (!isPlainEditRun(ctx) || ctx.project.kind !== "html") {
    return false;
  }

  return !(await isFilePresent(
    path.join(ctx.direction.workTree, toTargetFile(ctx))
  ));
};

const isStarterLookSource = (ctx: StarterLookContext): boolean =>
  (ctx.project.imported?.created ?? true) && !ctx.project.appProjectId;

const isStarterLookProject = (ctx: StarterLookContext): boolean =>
  !ctx.designSystem && !ctx.project.packId && isStarterLookSource(ctx);

const isStarterLookRequest = (ctx: StarterLookContext): boolean =>
  isStarterLookProject(ctx) &&
  ctx.request.level !== "wireframe" &&
  !isLeanRun(ctx.request);

const isStarterLookRun = async (ctx: StarterLookContext): Promise<boolean> => {
  if (!isStarterLookRequest(ctx) || !(await isNewPageRun(ctx))) {
    return false;
  }

  return !(await isFilePresent(path.join(ctx.direction.workTree, TOKENS_FILE)));
};

export { isNewPageRun, isStarterLookRun };
