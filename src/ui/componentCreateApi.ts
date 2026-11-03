import { routes } from "../shared/actions/direct-edit/routes.js";
import type { CreateComponentRequest } from "../shared/component-create";
import type { SourceLoc } from "../shared/contracts";
import { ApiError } from "./api";
import { call } from "./platform/http";

export const componentCreateApi = {
  folders: (pid: string, did: string) =>
    call(routes.listComponentFoldersDirectEdit, {
      directionId: did,
      projectId: pid,
    }),
  create: (pid: string, did: string, request: CreateComponentRequest) =>
    call(routes.createComponentDirectEdit, {
      ...request,
      directionId: did,
      projectId: pid,
    }),
  swapCandidates: (pid: string, did: string, use: SourceLoc) =>
    call(routes.listSwapCandidatesDirectEdit, {
      col: use.col,
      directionId: did,
      file: use.file,
      line: use.line,
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
};

export function apiMessage(error: unknown): string {
  if (
    error instanceof ApiError &&
    error.data &&
    typeof (error.data as { message?: unknown }).message === "string"
  ) {
    return (error.data as { message: string }).message;
  }

  return error instanceof Error ? error.message : String(error);
}
