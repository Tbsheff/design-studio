import type {
  AppLogLine,
  AppRoute,
  AppServerStatus,
  AttachAppRequest,
  AttachedApp,
  FirstVersionState,
  Direction,
  Project,
  RenderCheckResult,
  WorkTreeStatus,
} from "@design-studio/contracts";
import type {
  AppFixResult,
  DoctorCauseKind,
} from "@design-studio/contracts/app-doctor";

import type { FlowInput, FlowResult } from "../shared/route-flow";
import { json, toProjectPath, toDirectionPath } from "./api-core.js";

const appApi = {
  appConfig: (
    pid: string,
    input: { url?: string; env?: Record<string, string> }
  ): Promise<{ app: AttachedApp }> =>
    json<{ app: AttachedApp }>(
      "POST",
      `${toProjectPath(pid)}/app/config`,
      input
    ),
  appControl: (
    pid: string,
    action: "start" | "stop" | "restart"
  ): Promise<AppServerStatus> =>
    json<AppServerStatus>("POST", `${toProjectPath(pid)}/app/${action}`),
  appFix: (pid: string, kind: DoctorCauseKind): Promise<AppFixResult> =>
    json<AppFixResult>("POST", `${toProjectPath(pid)}/app/doctor/fix`, {
      kind,
    }),
  appRoutes: (pid: string): Promise<{ routes: AppRoute[] }> =>
    json<{ routes: AppRoute[] }>("GET", `${toProjectPath(pid)}/app/routes`),
  appState: (
    pid: string
  ): Promise<{
    app: AttachedApp;
    status: AppServerStatus | null;
    logs: AppLogLine[];
    firstVersion: FirstVersionState | null;
  }> =>
    json<{
      app: AttachedApp;
      status: AppServerStatus | null;
      logs: AppLogLine[];
      firstVersion: FirstVersionState | null;
    }>("GET", `${toProjectPath(pid)}/app`),
  attachApp: (input: AttachAppRequest): Promise<{ project: Project }> =>
    json<{ project: Project }>("POST", "/api/projects/attach", input),
  buildFlow: (pid: string, input: FlowInput): Promise<FlowResult> =>
    json<FlowResult>("POST", `${toProjectPath(pid)}/flow`, input),
  createDirection: (
    pid: string,
    fromVersionId: string,
    name: string
  ): Promise<Direction> =>
    json<Direction>("POST", `${toProjectPath(pid)}/directions`, {
      fromVersionId,
      name,
    }),
  directionPreview: (pid: string, did: string): Promise<{ url: string }> =>
    json<{ url: string }>("GET", `${toDirectionPath(pid, did)}/preview`),
  flowParams: (pid: string): Promise<{ params: Record<string, string> }> =>
    json<{ params: Record<string, string> }>(
      "GET",
      `${toProjectPath(pid)}/flow/params`
    ),
  openSource: (
    pid: string,
    did: string,
    source: string
  ): Promise<{ opened: boolean; path: string }> =>
    json<{ opened: boolean; path: string }>(
      "POST",
      `${toDirectionPath(pid, did)}/open-source`,
      { source }
    ),
  renderCheck: async (
    pid: string,
    did: string
  ): Promise<RenderCheckResult[]> => {
    const checked = await json<{ results: RenderCheckResult[] }>(
      "POST",
      `${toDirectionPath(pid, did)}/check`
    );

    return checked.results;
  },
  status: (pid: string, did: string): Promise<WorkTreeStatus> =>
    json<WorkTreeStatus>("GET", `${toDirectionPath(pid, did)}/status`),
  workTreeFiles: (pid: string, did: string): Promise<{ files: string[] }> =>
    json<{ files: string[] }>("GET", `${toDirectionPath(pid, did)}/tree`),
};

export { appApi };
