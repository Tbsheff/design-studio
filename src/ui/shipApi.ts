import type { getPlanShip } from "../shared/actions/ship/get-plan.js";
import type { getSettingsShip } from "../shared/actions/ship/get-settings.js";
import type { publishShip } from "../shared/actions/ship/publish.js";
import { routes } from "../shared/actions/ship/routes.js";
import type { setSettingsShip } from "../shared/actions/ship/set-settings.js";
import type { ShipRequest, ShipSettings } from "../shared/ship";
import { call } from "./platform/http";
import type { UiOutput } from "./platform/http";

interface PlanBase {
  readonly baseVersionId?: string;
}

const baseOf = (baseVersionId?: string): PlanBase => {
  if (baseVersionId) {
    return { baseVersionId };
  }

  return {};
};

const toSettingsBody = (settings: ShipSettings): ShipSettings => ({
  bodyTemplate: settings.bodyTemplate,
  branchTemplate: settings.branchTemplate,
  issueId: settings.issueId,
  user: settings.user,
});

const toPublishBody = (request: ShipRequest): ShipRequest => ({
  baseVersionId: request.baseVersionId,
  body: request.body,
  branch: request.branch,
  commitMessage: request.commitMessage,
  files: [...request.files],
  headVersionId: request.headVersionId,
  mode: request.mode,
  title: request.title,
});

const shipApi = {
  prepare: (
    projectId: string,
    baseVersionId?: string
  ): Promise<UiOutput<typeof getPlanShip>> =>
    call(routes.getPlanShip, { ...baseOf(baseVersionId), projectId }),
  saveSettings: (
    projectId: string,
    settings: ShipSettings
  ): Promise<UiOutput<typeof setSettingsShip>> =>
    call(routes.setSettingsShip, { ...toSettingsBody(settings), projectId }),
  settings: (projectId: string): Promise<UiOutput<typeof getSettingsShip>> =>
    call(routes.getSettingsShip, { projectId }),
  ship: (
    projectId: string,
    request: ShipRequest
  ): Promise<UiOutput<typeof publishShip>> =>
    call(routes.publishShip, { ...toPublishBody(request), projectId }),
};

export { shipApi };
