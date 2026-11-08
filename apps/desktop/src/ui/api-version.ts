import { routes as versionsRoutes } from "@design-studio/actions/version/routes";
import type {
  EditHistoryState,
  EditSessionEnd,
  EditSessionState,
  Version,
  WorkTreeStatus,
} from "@design-studio/contracts";

import type {
  CommitTweaksResult,
  TweaksState,
  TweakValue,
} from "../shared/tweaks";
import { enc, json, toDirectionPath } from "./api-core.js";
import { call, pickMessage, request } from "./platform/http";
import {
  endEditSessionAt,
  restoreVersionAt,
  stepEditHistoryAt,
} from "./platform/version-edit-api";
import type { EditHistoryStep } from "./platform/version-edit-api";

const toBaseQuery = (base?: string): string => {
  if (base) {
    return `?base=${enc(base)}`;
  }

  return "";
};

const COMMIT_HISTORY_LIMIT = 1;

const versionApi = {
  commitTweaks: async (
    pid: string,
    did: string,
    values: Record<string, TweakValue>
  ): Promise<CommitTweaksResult> => {
    const res = await request(
      "POST",
      `${toDirectionPath(pid, did)}/tweaks/commit`,
      { values },
      pickMessage
    );

    return (await res.json()) as CommitTweaksResult;
  },
  discard: (pid: string, did: string): Promise<WorkTreeStatus> =>
    call(versionsRoutes.restoreWorkTreeVersion, {
      directionId: did,
      projectId: pid,
    }),
  editHistory: (pid: string, did: string): Promise<EditHistoryState> =>
    call(versionsRoutes.listHistoryVersion, {
      directionId: did,
      limit: COMMIT_HISTORY_LIMIT,
      projectId: pid,
    }),
  editHistoryStep: (
    pid: string,
    did: string,
    kind: "undo" | "redo"
  ): Promise<EditHistoryStep> => stepEditHistoryAt(pid, did, kind),
  editSession: (
    pid: string,
    did: string,
    base?: string
  ): Promise<EditSessionState> =>
    json<EditSessionState>(
      "GET",
      `${toDirectionPath(pid, did)}/edit-session${toBaseQuery(base)}`
    ),
  endEditSession: (
    pid: string,
    did: string,
    action: "save" | "discard",
    baseVersionId: string
  ): Promise<EditSessionEnd> =>
    endEditSessionAt(pid, did, action, baseVersionId),
  exportVersion: async (pid: string, vid: string): Promise<Blob> => {
    const exported = await call(versionsRoutes.exportVersion, {
      projectId: pid,
      versionId: vid,
    });

    const bytes = Uint8Array.from(
      atob(exported.base64),
      (char) => char.codePointAt(0) ?? 0
    );

    return new Blob([bytes], { type: "application/zip" });
  },
  getTweaks: (pid: string, did: string): Promise<TweaksState> =>
    json<TweaksState>("GET", `${toDirectionPath(pid, did)}/tweaks`),
  keep: (pid: string, did: string): Promise<Version> =>
    call(versionsRoutes.createVersion, { directionId: did, projectId: pid }),
  listVersions: async (pid: string, did: string): Promise<Version[]> => {
    const list = await call(versionsRoutes.listVersion, {
      directionId: did,
      projectId: pid,
    });

    const items: Version[] = list.items;

    return items;
  },
  restore: (pid: string, did: string, versionId: string): Promise<Version> =>
    restoreVersionAt(pid, did, versionId),
  undo: (pid: string, did: string): Promise<Version> =>
    call(versionsRoutes.restoreHeadVersion, {
      directionId: did,
      projectId: pid,
    }),
  versionPreview: (pid: string, vid: string): Promise<{ url: string }> =>
    call(versionsRoutes.inspectPreviewVersion, {
      projectId: pid,
      versionId: vid,
    }),
};

export { versionApi };
