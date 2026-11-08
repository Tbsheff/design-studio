import {
  LINK_ACTIONS,
  LINK_DURATION_DEFAULT,
  LINK_DURATION_MAX,
  LINK_DURATION_MIN,
  LINK_EASINGS,
  LINK_SELECTOR_MAX,
  LINK_TRANSITIONS,
} from "@design-studio/contracts/links";
import { Schema } from "effect";

import { FLOW_MAX_DEPTH } from "../../shared/route-flow.js";
import {
  toDefaulted,
  toLooseTool,
  toOptional,
  toOptionalFlag,
  toOptionalInt,
  toOptionalText,
  toTrimmedText,
} from "../agent-tools/index.js";

const X_KEY = "x";
const Y_KEY = "y";
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

const jsonRecord = Schema.Record(Schema.String, Schema.Json);

const frameRefField = toTrimmedText(1, FRAME_REF_MAX).annotate({
  description: "Frame id or @label.",
});

const frameSizes = ["desktop", "tablet", "mobile"] as const;

const placeFrameFields = {
  [X_KEY]: toOptional(
    Schema.Int,
    "Absolute canvas x. Overrides the relative x."
  ),
  [Y_KEY]: toOptional(
    Schema.Int,
    "Absolute canvas y. Overrides the relative y."
  ),
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
};

const placeFrameList = Schema.Array(Schema.Struct(placeFrameFields)).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(FRAME_LIST_MAX)
);

const canvasPlaceInput = toLooseTool({ frames: placeFrameList });

const canvasPointInput = toLooseTool({
  frame: frameRefField,
  selector: toOptional(
    toTextLimit(POINT_SELECTOR_MAX),
    "CSS selector of the element."
  ),
});

const LINK_BATCH_MAX = 20;
const LINK_ID_BATCH_MAX = 50;
const IMPLICIT_LINK_ID = /^(?:i[0-9a-z]{1,12}|all)$/u;
const LINK_ID = /^l\d{1,5}$/u;

const linkSpecFields = Schema.Struct({
  action: toOptional(
    Schema.Literals(LINK_ACTIONS),
    'navigate (default) replaces the frame; modal opens toFrame centred over the current frame; drawer opens it from the right edge. A backdrop click or Esc closes an overlay, and a "back" link inside it closes it too. Make modal and drawer frames the size of the dialog or panel, not a full page.'
  ),
  duration: toOptionalInt(
    LINK_DURATION_MIN,
    LINK_DURATION_MAX,
    `Transition length in ms. Default ${LINK_DURATION_DEFAULT}.`
  ),
  easing: toOptional(
    Schema.Literals(LINK_EASINGS),
    "ease-out (default), ease-in, ease-in-out, linear or spring (small overshoot)."
  ),
  fromFrame: toTrimmedText(1, FRAME_REF_MAX).annotate({
    description: "Frame id or @label of the frame that has the element.",
  }),
  selector: toTrimmedText(1, LINK_SELECTOR_MAX).annotate({
    description:
      'CSS selector of the element to click, for example "#sign-in" or "button.primary".',
  }),
  toFrame: toTrimmedText(1, FRAME_REF_MAX).annotate({
    description:
      'Frame id or @label to go to on click, or "back" to go back to the frame before.',
  }),
  transition: toOptional(
    Schema.Literals(LINK_TRANSITIONS),
    "instant (default), dissolve, slide-left, slide-right (both frames move sideways), push-up, push-down, move-in (the new frame moves up over the old one), move-out (the old frame moves down off the new one), or smart-animate (layers with the same id, or the same tag and text, move from their old place to the new one; the rest fade in). Use smart-animate between two states of one screen."
  ),
});

const linkSpecList = Schema.Array(linkSpecFields).check(
  Schema.isMaxLength(LINK_BATCH_MAX)
);

const implicitLinkId = Schema.String.check(Schema.isPattern(IMPLICIT_LINK_ID));

const implicitLinkIds = Schema.Array(implicitLinkId).check(
  Schema.isMaxLength(LINK_ID_BATCH_MAX)
);

const linkId = Schema.String.check(Schema.isPattern(LINK_ID));

const linkIds = Schema.Array(linkId).check(
  Schema.isMaxLength(LINK_ID_BATCH_MAX)
);

const editLinksInput = toLooseTool({
  add: toOptional(
    linkSpecList,
    "Links to add (or replace, for the same element)."
  ),
  keep: toOptional(
    implicitLinkIds,
    'Ids of implicit links (implicit: true in list_links, from <a href> between pages) to save as normal links, or ["all"]. Then add the same selector again to change its action or transition.'
  ),
  remove: toOptional(linkIds, "Link ids from list_links to remove."),
  startFrame: toOptionalText(
    1,
    FRAME_REF_MAX,
    "Frame id or @label where Play starts."
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

const frameStateInput = toLooseTool({
  frame: frameRefField,
  mock: Schema.optionalKey(mockFields),
  state: Schema.String.check(Schema.isPattern(STATE_ID)),
});

const sessionUser = Schema.Struct({
  email: toTextLimit(USER_EMAIL_MAX),
  name: toTextLimit(USER_NAME_MAX),
});

const frameSessionInput = toLooseTool({
  forgetCookies: Schema.optionalKey(Schema.Boolean),
  user: Schema.optionalKey(sessionUser),
});

const routeLinkInput = toLooseTool({
  route: toTrimmedText(1, ROUTE_MAX),
});

const doctorInput = toLooseTool({
  fresh: Schema.optionalKey(Schema.Boolean),
});

const TWEAK_CONTROLS_NOTE =
  "Each control: {id, label, cssVar, type: range {min, max, step?, unit?, default: number} | color {default} | toggle {on, off, default: boolean} | select {options: [{label, value}], default}}.";

const tweakControls = Schema.Array(jsonRecord)
  .check(Schema.isMaxLength(TWEAK_CONTROLS_MAX))
  .annotate({ description: TWEAK_CONTROLS_NOTE });

const TWEAKS_TOOL = toLooseTool({ controls: tweakControls });

const flowParams = Schema.Record(Schema.String, toTextLimit(FLOW_PARAM_MAX));

const flowRoutes = Schema.Array(toTrimmedText(1, ROUTE_MAX)).check(
  Schema.isMaxLength(FRAME_LIST_MAX)
);

const FLOW_TOOL = toLooseTool({
  depth: toOptionalInt(0, FLOW_MAX_DEPTH, "How many links deep to follow."),
  from: toOptionalText(1, ROUTE_MAX, "Route to start from."),
  params: Schema.optionalKey(flowParams),
  routes: Schema.optionalKey(flowRoutes),
});

const TARGET_STATE = /^[a-z][a-z0-9-]{0,23}$/u;

const targetState = Schema.String.check(
  Schema.isPattern(TARGET_STATE)
).annotate({
  description:
    "Attached apps: frame state id (default, session, empty, loading, error or a mock id) instead of the frame state.",
});

const TARGET_FIELDS = {
  frame: toOptionalText(
    1,
    FRAME_REF_MAX,
    "Canvas frame id or @label: render its page with its frame state. Leave out for the frame from <canvas-context>."
  ),
  path: toOptionalText(
    0,
    ROUTE_MAX,
    "Page path instead of the frame page, such as /settings or about.html."
  ),
  state: Schema.optionalKey(targetState),
};

const TARGET_TOOL = toLooseTool(TARGET_FIELDS);

const pageOffset = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

const SCREENSHOT_TOOL = toLooseTool({
  ...TARGET_FIELDS,
  from: toDefaulted(
    pageOffset,
    0,
    "Page y offset in px where the first image starts."
  ),
  screen: toOptionalInt(
    1,
    FRAME_LIST_MAX,
    "Screen number from the render_check screens list: a view inside a multi-view page, a canvas frame or an app route frame. Overrides frame and path."
  ),
  theme: toDefaulted(
    Schema.Literals(["light", "dark"]),
    "light" as const,
    'dark sets data-theme="dark" and the .dark class on <html> before the shot, so tokens.css uses the dark values.'
  ),
  viewport: toOptional(
    Schema.Literals(["desktop", "mobile", "tablet"]),
    "Render size. Leave out for the frame size (desktop when there is no frame)."
  ),
});

const HELP_FIELDS = {
  tool: toTrimmedText(0, FRAME_LABEL_MAX).annotate({
    description: "Tool name without the mcp__studio__ prefix.",
  }),
};

const HELP_INPUT = toLooseTool(HELP_FIELDS);

export {
  FLOW_TOOL,
  HELP_INPUT,
  SCREENSHOT_TOOL,
  TARGET_TOOL,
  TWEAKS_TOOL,
  canvasPlaceInput,
  canvasPointInput,
  doctorInput,
  editLinksInput,
  frameSessionInput,
  frameStateInput,
  routeLinkInput,
};
