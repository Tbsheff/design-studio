import type { WireInput } from "@design-studio/actions/_core/action";
import type { applyPublish } from "@design-studio/actions/publish/apply";
import type { deleteCommentPublish } from "@design-studio/actions/publish/delete-comment";
import type { deletePublish } from "@design-studio/actions/publish/delete";
import type { getPublish } from "@design-studio/actions/publish/get";
import type { inspectPublish } from "@design-studio/actions/publish/inspect";
import type { listCommentsPublish } from "@design-studio/actions/publish/list-comments";
import type { listPublish } from "@design-studio/actions/publish/list";
import type { publishPublish } from "@design-studio/actions/publish/publish";
import type { restorePublish } from "@design-studio/actions/publish/restore";
import { routes } from "@design-studio/actions/publish/routes";
import type { PublishBackendMode } from "@design-studio/actions/publish/schema";
import type { setPublish } from "@design-studio/actions/publish/set";
import type { startPublish } from "@design-studio/actions/publish/start";
import type { stopPublish } from "@design-studio/actions/publish/stop";
import type { unpublishPublish } from "@design-studio/actions/publish/unpublish";
import type { PublishPlan } from "../../../shared/publish.js";
import { json } from "../../api.js";
import { call } from "../../platform/http.js";
import type { UiOutput } from "../../platform/http.js";

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
