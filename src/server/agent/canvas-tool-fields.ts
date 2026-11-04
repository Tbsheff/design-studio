import { Schema } from "effect";

import { toSdkFieldSet } from "../agent-tools/sdk-shape.js";
import type { SdkFields } from "../agent-tools/sdk-shape.js";
import {
  toOptional,
  toOptionalFlag,
  toOptionalInt,
  toOptionalText,
  toTrimmedText,
} from "./tool-input.js";

const FRAME_REF_MAX = 60;
const FRAME_LABEL_MAX = 40;
const FRAME_PATH_MAX = 200;
const FRAME_GAP_MAX = 2000;
const FRAME_SIZE_MIN = 200;
const FRAME_SIZE_MAX = 4000;
const FRAME_LIST_MAX = 12;
const POINT_SELECTOR_MAX = 400;
const MOCK_RULES_MAX = 40;
const USER_NAME_MAX = 80;
const USER_EMAIL_MAX = 120;
const ROUTE_MAX = 300;
const FLOW_PARAM_MAX = 80;
const TWEAK_CONTROLS_MAX = 12;
const STATE_ID = /^[a-z][a-z0-9-]{0,23}$/u;

const toTextLimit = (max: number): Schema.String =>
  Schema.String.check(Schema.isMaxLength(max));

const jsonRecord = Schema.Record(Schema.String, Schema.Unknown);

const frameRefField = toTrimmedText(1, FRAME_REF_MAX).annotate({
  description: "Frame id or @label.",
});

const frameSizes = ["desktop", "tablet", "mobile"] as const;

const placeFrameFields = {
  above: toOptionalText(1, FRAME_REF_MAX, "Put the frame above this frame."),
  below: toOptionalText(
    1,
    FRAME_REF_MAX,
    "Put the frame under this frame (id or @label), left edges lined up."
  ),
  frame: toOptionalText(
    1,
    FRAME_REF_MAX,
    "Id or @label of a frame to move or change. Leave out to add a new frame."
  ),
  gap: toOptionalInt(
    0,
    FRAME_GAP_MAX,
    "Space between the frames in px. Default 80."
  ),
  height: toOptionalInt(FRAME_SIZE_MIN, FRAME_SIZE_MAX, "Frame height in px."),
  hidden: toOptionalFlag("Hide the frame."),
  label: toOptional(
    toTextLimit(FRAME_LABEL_MAX),
    'Short name shown on the frame label, for example "Empty" or "Pricing".'
  ),
  leftOf: toOptionalText(
    1,
    FRAME_REF_MAX,
    "Put the frame to the left of this frame."
  ),
  path: toOptional(
    toTextLimit(FRAME_PATH_MAX),
    'Page the frame shows, relative to the project root, for example "states/empty.html". Empty string = the entry page.'
  ),
  rightOf: toOptionalText(
    1,
    FRAME_REF_MAX,
    "Put the frame to the right of this frame, top edges lined up."
  ),
  viewport: toOptional(
    Schema.Literals(frameSizes),
    "Frame size preset: desktop 1440x900, tablet 768x1024, mobile 390x844."
  ),
  width: toOptionalInt(FRAME_SIZE_MIN, FRAME_SIZE_MAX, "Frame width in px."),
  x: toOptional(Schema.Int, "Absolute canvas x. Overrides the relative x."),
  y: toOptional(Schema.Int, "Absolute canvas y. Overrides the relative y."),
};

const placeFrameList = Schema.Array(Schema.Struct(placeFrameFields)).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(FRAME_LIST_MAX)
);

const canvasPlaceInput: SdkFields = toSdkFieldSet({ frames: placeFrameList });

const canvasPointInput: SdkFields = toSdkFieldSet({
  frame: frameRefField,
  selector: toOptional(
    toTextLimit(POINT_SELECTOR_MAX),
    "CSS selector of the element."
  ),
});

const mockRules = Schema.Array(jsonRecord).check(
  Schema.isMaxLength(MOCK_RULES_MAX)
);

const mockFields = Schema.Struct({
  name: Schema.optionalKey(toTextLimit(FRAME_LABEL_MAX)),
  rules: Schema.optionalKey(mockRules),
  signedIn: Schema.optionalKey(Schema.Boolean),
});

const frameStateInput: SdkFields = toSdkFieldSet({
  frame: frameRefField,
  mock: Schema.optionalKey(mockFields),
  state: Schema.String.check(Schema.isPattern(STATE_ID)),
});

const sessionUser = Schema.Struct({
  email: toTextLimit(USER_EMAIL_MAX),
  name: toTextLimit(USER_NAME_MAX),
});

const frameSessionInput: SdkFields = toSdkFieldSet({
  forgetCookies: Schema.optionalKey(Schema.Boolean),
  user: Schema.optionalKey(sessionUser),
});

const routeLinkInput: SdkFields = toSdkFieldSet({
  route: toTrimmedText(1, ROUTE_MAX),
});

const doctorInput: SdkFields = toSdkFieldSet({
  fresh: Schema.optionalKey(Schema.Boolean),
});

const toTweaksInput = (description: string): SdkFields => {
  const controls = Schema.Array(jsonRecord).check(
    Schema.isMaxLength(TWEAK_CONTROLS_MAX)
  );

  return toSdkFieldSet({ controls: controls.annotate({ description }) });
};

const toFlowInput = (depthMax: number): SdkFields => {
  const params = Schema.Record(Schema.String, toTextLimit(FLOW_PARAM_MAX));

  const routes = Schema.Array(toTrimmedText(1, ROUTE_MAX)).check(
    Schema.isMaxLength(FRAME_LIST_MAX)
  );

  return toSdkFieldSet({
    depth: toOptionalInt(0, depthMax, "How many links deep to follow."),
    from: toOptionalText(1, ROUTE_MAX, "Route to start from."),
    params: Schema.optionalKey(params),
    routes: Schema.optionalKey(routes),
  });
};

export {
  canvasPlaceInput,
  canvasPointInput,
  doctorInput,
  frameSessionInput,
  frameStateInput,
  routeLinkInput,
  toFlowInput,
  toTweaksInput,
};
