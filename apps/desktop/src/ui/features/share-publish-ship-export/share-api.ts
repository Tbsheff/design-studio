import type { createShare } from "@design-studio/actions/share/create";
import type { deleteShare } from "@design-studio/actions/share/delete";
import type { listShare } from "@design-studio/actions/share/list";
import { routes } from "@design-studio/actions/share/routes";
import type { setLanShare } from "@design-studio/actions/share/set-lan";
import type { updateShare } from "@design-studio/actions/share/update";
import type { ExportFrame } from "@design-studio/contracts/export";
import type { ShareExpiryHours } from "@design-studio/contracts/share";

import { call } from "../../platform/http.js";
import type { UiOutput } from "../../platform/http.js";

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
  globalThis.dispatchEvent(
    new CustomEvent(SHARES_CHANGED, { detail: { projectId } })
  );
};

const shareApi = {
  create: (
    ownerProjectId: string,
    input: CreateRequest
  ): Promise<UiOutput<typeof createShare>> =>
    call(routes.createShare, {
      directionId: input.directionId,
      expiresInHours: input.expiresInHours,
      frames: [...input.frameIds],
      live: input.live,
      projectId: ownerProjectId,
      versionId: input.versionId,
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
