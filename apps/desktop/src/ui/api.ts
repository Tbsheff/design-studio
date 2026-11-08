import { appApi } from "./api-app.js";
import { canvasApi } from "./api-canvas.js";
import { editApi } from "./api-edit.js";
import { projectApi } from "./api-project.js";
import { runApi } from "./api-run.js";
import { styleApi } from "./api-style.js";
import { telemetryApi } from "./api-telemetry.js";
import { versionApi } from "./api-version.js";
import { workspaceApi } from "./api-workspace.js";

const api = {
  ...appApi,
  ...canvasApi,
  ...editApi,
  ...projectApi,
  ...runApi,
  ...styleApi,
  ...telemetryApi,
  ...versionApi,
  ...workspaceApi,
};

export { arrange, replaceStyle } from "./api-edit.js";

export { rulesApi } from "./api-rules.js";

export { errorText } from "./api-error.js";

export { sendTelemetry } from "./api-telemetry.js";

export { getBlob, json, warmProject } from "./api-core.js";

export { ApiError } from "./platform/http";

export type {
  IconInsertBody,
  IconInsertReply,
  IconListQuery,
} from "./platform/icon-api";

export { api };

export type {
  CanvasSnapshot,
  FillInputBody,
  FillSetBody,
  FillStopBody,
  MotionSetBody,
  MotionSpecBody,
  SpacingBox,
  SpacingComputed,
  SpacingSetBody,
  SpacingStep,
  TextStyleApplyBody,
  TextStyleCreateBody,
  TextStyleDetachBody,
  TextStyleTargetBody,
} from "./api-body-types.js";
