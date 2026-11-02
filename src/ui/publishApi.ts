import type { WireInput, WireOutput } from "../shared/actions/_core/action.js";
import type { applyPublish } from "../shared/actions/publish/apply.js";
import type { deleteCommentPublish } from "../shared/actions/publish/delete-comment.js";
import type { deletePublish } from "../shared/actions/publish/delete.js";
import type { getPublish } from "../shared/actions/publish/get.js";
import type { inspectPublish } from "../shared/actions/publish/inspect.js";
import type { listCommentsPublish } from "../shared/actions/publish/list-comments.js";
import type { listPublish } from "../shared/actions/publish/list.js";
import type { publishPublish } from "../shared/actions/publish/publish.js";
import type { restorePublish } from "../shared/actions/publish/restore.js";
import { routes } from "../shared/actions/publish/routes.js";
import type { PublishBackendMode } from "../shared/actions/publish/schema.js";
import type { setPublish } from "../shared/actions/publish/set.js";
import type { startPublish } from "../shared/actions/publish/start.js";
import type { stopPublish } from "../shared/actions/publish/stop.js";
import type { unpublishPublish } from "../shared/actions/publish/unpublish.js";
import type { PublishPlan } from "../shared/publish";
import { json } from "./api";
import { call } from "./platform/http";

type PublishRequest = Omit<WireInput<typeof publishPublish>, "projectId">;

type CliState = WireOutput<typeof getPublish>;

type BackendState = WireOutput<typeof inspectPublish>;

const toFlag = (isOn: boolean): WireInput<typeof getPublish> => {
  if (isOn) {
    return { fresh: "1" };
  }

  return {};
};

const toCheck = (isOn: boolean): WireInput<typeof inspectPublish> => {
  if (isOn) {
    return { check: "1" };
  }

  return {};
};

const planPath = (projectId: string): string =>
  `/api/projects/${encodeURIComponent(projectId)}/publish/plan`;

const publishApi = {
  backend: (isCheck = false): Promise<BackendState> =>
    call(routes.inspectPublish, toCheck(isCheck)),
  cancelLogin: (): Promise<WireOutput<typeof stopPublish>> =>
    call(routes.stopPublish, {}),
  cli: (isFresh = false): Promise<CliState> =>
    call(routes.getPublish, toFlag(isFresh)),
  comments: (
    projectId: string,
    publicationId: string
  ): Promise<WireOutput<typeof listCommentsPublish>> =>
    call(routes.listCommentsPublish, { projectId, publicationId }),
  deleteComment: (
    projectId: string,
    publicationId: string,
    commentId: string
  ): Promise<WireOutput<typeof deleteCommentPublish>> =>
    call(routes.deleteCommentPublish, { commentId, projectId, publicationId }),
  list: (projectId: string): Promise<WireOutput<typeof listPublish>> =>
    call(routes.listPublish, { projectId }),
  login: (
    keyring: boolean,
    narrow: boolean
  ): Promise<WireOutput<typeof startPublish>> =>
    call(routes.startPublish, { keyring, narrow }),
  logout: (): Promise<WireOutput<typeof deletePublish>> =>
    call(routes.deletePublish, {}),
  plan: (projectId: string, input: PublishRequest): Promise<PublishPlan> =>
    json<PublishPlan>("POST", planPath(projectId), input),
  publish: (
    projectId: string,
    input: PublishRequest
  ): Promise<WireOutput<typeof publishPublish>> =>
    call(routes.publishPublish, { ...input, projectId }),
  rollback: (
    projectId: string,
    publicationId: string,
    versionId: string
  ): Promise<WireOutput<typeof restorePublish>> =>
    call(routes.restorePublish, { projectId, publicationId, versionId }),
  setAccount: (
    accountId: string | null
  ): Promise<WireOutput<typeof setPublish>> =>
    call(routes.setPublish, { accountId }),
  setup: (mode: PublishBackendMode): Promise<WireOutput<typeof applyPublish>> =>
    call(routes.applyPublish, { mode }),
  unpublish: (
    projectId: string,
    publicationId: string
  ): Promise<WireOutput<typeof unpublishPublish>> =>
    call(routes.unpublishPublish, { projectId, publicationId }),
};

export { publishApi };

export type { PublishRequest };
