import type { createShare } from "../shared/actions/share/create.js";
import type { deleteShare } from "../shared/actions/share/delete.js";
import type { listShare } from "../shared/actions/share/list.js";
import { routes } from "../shared/actions/share/routes.js";
import type { setLanShare } from "../shared/actions/share/set-lan.js";
import type { updateShare } from "../shared/actions/share/update.js";
import type { ExportFrame } from "../shared/export";
import type { ShareExpiryHours } from "../shared/share";
import { call } from "./platform/http";
import type { UiOutput } from "./platform/http";

interface CreateRequest {
  readonly directionId: string | null;
  readonly expiresInHours: ShareExpiryHours;
  readonly frameIds: readonly string[];
  readonly frames: readonly ExportFrame[];
  readonly live: boolean;
  readonly versionId: string;
}

const SHARES_CHANGED = "studio:shares-changed";

const sharesChanged = (projectId: string): void => {
  window.dispatchEvent(
    new CustomEvent(SHARES_CHANGED, { detail: { projectId } })
  );
};

const shareApi = {
  create: (
    projectId: string,
    input: CreateRequest
  ): Promise<UiOutput<typeof createShare>> =>
    call(routes.createShare, {
      directionId: input.directionId,
      expiresInHours: input.expiresInHours,
      frames: [...input.frameIds],
      live: input.live,
      versionId: input.versionId,
      projectId,
    }),
  list: (projectId: string): Promise<UiOutput<typeof listShare>> =>
    call(routes.listShare, { projectId }),
  revoke: (
    projectId: string,
    shareId: string
  ): Promise<UiOutput<typeof deleteShare>> =>
    call(routes.deleteShare, { projectId, shareId }),
  setLan: (isOn: boolean): Promise<UiOutput<typeof setLanShare>> =>
    call(routes.setLanShare, { isOn }),
  setStudioCursor: (
    projectId: string,
    shareId: string,
    isOn: boolean
  ): Promise<UiOutput<typeof updateShare>> =>
    call(routes.updateShare, { projectId, shareId, studioCursor: isOn }),
};

export { SHARES_CHANGED, shareApi, sharesChanged };
