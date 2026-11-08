import { routes } from "@design-studio/actions/direct-edit/routes";
import type { SourceLoc } from "@design-studio/contracts";

import type { CreateComponentRequest } from "../../../shared/component-create.js";
import { ApiError } from "../../api.js";
import { call } from "../../platform/http.js";
import type { RouteOutput } from "../../platform/http.js";

type CreateOutput = RouteOutput<typeof routes.createComponentDirectEdit>;

type FoldersOutput = RouteOutput<typeof routes.listComponentFoldersDirectEdit>;

type SwapOutput = RouteOutput<typeof routes.applySwapDirectEdit>;

type CandidatesOutput = RouteOutput<typeof routes.listSwapCandidatesDirectEdit>;

const componentCreateApi = {
  create: (
    pid: string,
    did: string,
    request: CreateComponentRequest
  ): Promise<CreateOutput> =>
    call(routes.createComponentDirectEdit, {
      ...request,
      directionId: did,
      projectId: pid,
    }),
  folders: (pid: string, did: string): Promise<FoldersOutput> =>
    call(routes.listComponentFoldersDirectEdit, {
      directionId: did,
      projectId: pid,
    }),
  swap: (
    pid: string,
    did: string,
    source: SourceLoc,
    component: { name: string; file: string }
  ): Promise<SwapOutput> =>
    call(routes.applySwapDirectEdit, {
      component,
      directionId: did,
      projectId: pid,
      use: source,
    }),
  swapCandidates: (
    pid: string,
    did: string,
    use: SourceLoc
  ): Promise<CandidatesOutput> =>
    call(routes.listSwapCandidatesDirectEdit, {
      col: use.col,
      directionId: did,
      file: use.file,
      line: use.line,
      projectId: pid,
    }),
};

const apiDataMessage = (error: ApiError): string | null => {
  const message = error.data?.["message"] ?? null;

  if (message === String(message)) {
    return String(message);
  }

  return null;
};

const apiMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    const message = apiDataMessage(error);

    if (message !== null) {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

export { apiMessage, componentCreateApi };
