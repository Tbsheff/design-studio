import type {
  DirectEditRequest,
  TelemetrySample,
} from "@design-studio/contracts";

import { json, enc } from "./api-core.js";

const telemetryApi = {
  getTelemetry: (pid: string): Promise<TelemetrySample[]> =>
    json<TelemetrySample[]>("GET", `/api/telemetry?projectId=${enc(pid)}`),
  postTelemetry: (sample: TelemetrySample): Promise<{ ok: boolean }> =>
    json<{ ok: boolean }>("POST", "/api/telemetry", sample),
};

interface EditTarget {
  readonly directionId: string;
  readonly projectId: string;
}

const editKind = (req: DirectEditRequest): string => {
  if (req.move) {
    return "move";
  }

  if (req.insert) {
    return "insert";
  }

  if ("text" in req) {
    return "text";
  }

  if ("name" in req) {
    return "name";
  }

  return "style";
};

const sendTelemetry = (sample: Omit<TelemetrySample, "ts">): void => {
  void Promise.allSettled([
    telemetryApi.postTelemetry({ ...sample, ts: Date.now() }),
  ]);
};

const timedEdit = async <Result>(
  target: EditTarget,
  kind: string,
  count: number,
  commit: () => Promise<Result>
): Promise<Result> => {
  const started = performance.now();
  const result = await commit();
  sendTelemetry({
    detail: { count, kind },
    directionId: target.directionId,
    kind: "edit.commit",
    ms: Math.round(performance.now() - started),
    projectId: target.projectId,
  });

  return result;
};

export { editKind, sendTelemetry, telemetryApi, timedEdit };

export type { EditTarget };
