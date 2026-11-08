import { routes } from "@design-studio/actions/direct-edit/routes";
import type { SourceLoc } from "@design-studio/contracts";

import type { CreateComponentRequest } from "../../../shared/component-create.js";
import { ApiError } from "../../api.js";
import { call } from "../../platform/http.js";

const componentCreateApi = {
  create: (pid: string, did: string, request: CreateComponentRequest) =>
    call(routes.createComponentDirectEdit, {
      ...request,
      directionId: did,
      projectId: pid,
    }),
  folders: (pid: string, did: string) =>
    call(routes.listComponentFoldersDirectEdit, {
      directionId: did,
      projectId: pid,
    }),
  swap: (
    pid: string,
    did: string,
    source: SourceLoc,
    component: { name: string; file: string }
  ) =>
    call(routes.applySwapDirectEdit, {
      component,
      directionId: did,
      projectId: pid,
      use: source,
    }),
  swapCandidates: (pid: string, did: string, use: SourceLoc) =>
    call(routes.listSwapCandidatesDirectEdit, {
      col: use.col,
      directionId: did,
      file: use.file,
      line: use.line,
      projectId: pid,
    }),
};

const apiMessage = (error: unknown): string => {
  if (
    error instanceof ApiError &&
    error.data &&
    typeof (error.data as { message?: unknown }).message === "string"
  ) {
    return (error.data as { message: string }).message;
  }

  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export { componentCreateApi, apiMessage };
