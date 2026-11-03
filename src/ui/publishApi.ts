import type { WireInput } from "../shared/actions/_core/action.js";
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
import type { UiOutput } from "./platform/http";

type PublishRequest = Omit<WireInput<typeof publishPublish>, "projectId">;

type CliState = UiOutput<typeof getPublish>;

type BackendState = UiOutput<typeof inspectPublish>;

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

interface PublicationFlags {
  readonly isLegacy: boolean;
}

const isReadOnlyPublication = (item: PublicationFlags): boolean =>
  item.isLegacy;

const planPath = (projectId: string): string =>
  `/api/projects/${encodeURIComponent(projectId)}/publish/plan`;

const publishApi = {
  backend: (isCheck = false): Promise<BackendState> =>
    call(routes.inspectPublish, toCheck(isCheck)),
  cancelLogin: (): Promise<UiOutput<typeof stopPublish>> =>
    call(routes.stopPublish, {}),
  cli: (isFresh = false): Promise<CliState> =>
    call(routes.getPublish, toFlag(isFresh)),
  comments: (
    projectId: string,
    publicationId: string
  ): Promise<UiOutput<typeof listCommentsPublish>> =>
    call(routes.listCommentsPublish, { projectId, publicationId }),
  deleteComment: (
    projectId: string,
    publicationId: string,
    commentId: string
  ): Promise<UiOutput<typeof deleteCommentPublish>> =>
    call(routes.deleteCommentPublish, { commentId, projectId, publicationId }),
  list: (projectId: string): Promise<UiOutput<typeof listPublish>> =>
    call(routes.listPublish, { projectId }),
  login: (
    keyring: boolean,
    narrow: boolean
  ): Promise<UiOutput<typeof startPublish>> =>
    call(routes.startPublish, { keyring, narrow }),
  logout: (): Promise<UiOutput<typeof deletePublish>> =>
    call(routes.deletePublish, {}),
  plan: (projectId: string, input: PublishRequest): Promise<PublishPlan> =>
    json<PublishPlan>("POST", planPath(projectId), input),
  publish: (
    projectId: string,
    input: PublishRequest
  ): Promise<UiOutput<typeof publishPublish>> =>
    call(routes.publishPublish, { ...input, projectId }),
  rollback: (
    projectId: string,
    publicationId: string,
    versionId: string
  ): Promise<UiOutput<typeof restorePublish>> =>
    call(routes.restorePublish, { projectId, publicationId, versionId }),
  setAccount: (
    accountId: string | null
  ): Promise<UiOutput<typeof setPublish>> =>
    call(routes.setPublish, { accountId }),
  setup: (mode: PublishBackendMode): Promise<UiOutput<typeof applyPublish>> =>
    call(routes.applyPublish, { mode }),
  unpublish: (
    projectId: string,
    publicationId: string
  ): Promise<UiOutput<typeof unpublishPublish>> =>
    call(routes.unpublishPublish, { projectId, publicationId }),
};

export { isReadOnlyPublication, publishApi };

export type { PublishRequest };
