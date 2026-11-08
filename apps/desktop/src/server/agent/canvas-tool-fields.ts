import { Schema } from "effect";

import {
  toDefaulted,
  toLooseTool,
  toOptional,
  toOptionalInt,
  toOptionalText,
  toTrimmedText,
} from "../agent-tools/index.js";

const FRAME_REF_MAX = 60;
const FRAME_LABEL_MAX = 40;
const FRAME_LIST_MAX = 12;
const ROUTE_MAX = 300;
const TWEAK_CONTROLS_MAX = 12;

const jsonRecord = Schema.Record(Schema.String, Schema.Json);

const doctorInput = toLooseTool({
  fresh: Schema.optionalKey(Schema.Boolean),
});

const TWEAK_CONTROLS_NOTE =
  "Each control: {id, label, cssVar, type: range {min, max, step?, unit?, default: number} | color {default} | toggle {on, off, default: boolean} | select {options: [{label, value}], default}}.";

const tweakControls = Schema.Array(jsonRecord)
  .check(Schema.isMaxLength(TWEAK_CONTROLS_MAX))
  .annotate({ description: TWEAK_CONTROLS_NOTE });

const TWEAKS_TOOL = toLooseTool({ controls: tweakControls });

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

export { HELP_INPUT, SCREENSHOT_TOOL, TARGET_TOOL, TWEAKS_TOOL, doctorInput };
