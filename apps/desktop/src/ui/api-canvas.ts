import type { CanvasPresence } from "@design-studio/contracts";
import type { CanvasFile } from "@design-studio/contracts/canvas-file";

import type { CanvasSnapshot } from "./api-body-types.js";
import { json, toProjectPath } from "./api-core.js";
import { request } from "./platform/http";

const sendPresence = async (
  pid: string,
  body: Omit<CanvasPresence, "at">
): Promise<void> => {
  await request(
    "PUT",
    `/api/projects/${encodeURIComponent(pid)}/canvas/presence`,
    body
  );
};

const canvasApi = {
  getCanvas: (pid: string): Promise<CanvasSnapshot> =>
    json<CanvasSnapshot>("GET", `${toProjectPath(pid)}/canvas`),
  putCanvas: (
    pid: string,
    body: {
      canvas: CanvasFile;
      baseHash: string | null;
      writer: string;
      migrate?: boolean;
    }
  ): Promise<CanvasSnapshot> =>
    json<CanvasSnapshot>("PUT", `${toProjectPath(pid)}/canvas`, body),
  putCanvasPresence: (
    pid: string,
    body: Omit<CanvasPresence, "at">
  ): Promise<void> => sendPresence(pid, body),
};

export { canvasApi };
