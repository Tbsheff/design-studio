import { Schema } from "effect";

import {
  LINK_ACTIONS,
  LINK_DURATION_MAX,
  LINK_DURATION_MIN,
  LINK_EASINGS,
  LINK_SELECTOR_MAX,
  LINK_TRANSITIONS,
} from "../../links.js";

const FRAME_REF_MAX = 120;

const LINK_IDS_MAX = 50;

const LinkIdSchema = Schema.String.check(Schema.isPattern(/^l\d{1,5}$/u));

const ImplicitLinkIdSchema = Schema.String.check(
  Schema.isPattern(/^i[0-9a-z]{1,12}$/u)
);

const FrameRefSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(FRAME_REF_MAX)
);

const LinkSelectorSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(LINK_SELECTOR_MAX)
);

const LinkActionSchema = Schema.Literals(LINK_ACTIONS);

const LinkEasingSchema = Schema.Literals(LINK_EASINGS);

const LinkTransitionSchema = Schema.Literals(LINK_TRANSITIONS);

const LinkDurationSchema = Schema.Int.check(
  Schema.isBetween({ maximum: LINK_DURATION_MAX, minimum: LINK_DURATION_MIN })
);

const ImplicitLinkIdListSchema = Schema.Array(ImplicitLinkIdSchema).check(
  Schema.isMaxLength(LINK_IDS_MAX)
);

const LinkMotionFields = {
  action: Schema.optionalKey(LinkActionSchema),
  duration: Schema.optionalKey(LinkDurationSchema),
  easing: Schema.optionalKey(LinkEasingSchema),
  transition: Schema.optionalKey(LinkTransitionSchema),
} as const;

const LinkListSchema = Schema.Struct({
  items: Schema.Array(Schema.Unknown),
  links: Schema.Unknown,
  note: Schema.NullOr(Schema.String),
  startFrame: Schema.String,
});

const ImplicitLinkListSchema = Schema.Struct({
  implicit: Schema.Array(Schema.Unknown),
});

const LinkSavedSchema = Schema.Struct({
  link: Schema.NullOr(Schema.Unknown),
  links: Schema.Unknown,
  title: Schema.NullOr(Schema.String),
});

const LinkKeptSchema = Schema.Struct({
  kept: Schema.Array(Schema.Unknown),
  links: Schema.Unknown,
});

const LinkFileSchema = Schema.Struct({
  links: Schema.Unknown,
});

const BaseHashSchema = Schema.NullOr(
  Schema.String.check(Schema.isPattern(/^[0-9a-f]{16}$/u))
);

const WriterIdSchema = Schema.String.check(
  Schema.isPattern(/^[A-Za-z0-9_-]{1,64}$/u)
);

const PresenceSideSchema = Schema.Int.check(
  Schema.isBetween({ maximum: 4000, minimum: 200 })
);

const PresenceLiveSizeSchema = Schema.Struct({
  height: PresenceSideSchema,
  width: PresenceSideSchema,
});

const PresenceSelectionSchema = Schema.Struct({
  selector: Schema.String.check(Schema.isMaxLength(400)),
  tag: Schema.String.check(Schema.isMaxLength(40)),
  text: Schema.String.check(Schema.isMaxLength(200)),
});

const PresenceFields = {
  activeFrameId: Schema.NullOr(Schema.String),
  directionId: Schema.NullOr(Schema.String),
  inView: Schema.Array(Schema.String).check(Schema.isMaxLength(64)),
  liveSize: Schema.optionalKey(PresenceLiveSizeSchema),
  selection: Schema.Array(PresenceSelectionSchema).check(
    Schema.isMaxLength(20)
  ),
} as const;

const CanvasDocSchema = Schema.Struct({
  canvas: Schema.Unknown,
  directionId: Schema.String,
  hash: Schema.NullOr(Schema.String),
});

const CanvasPresenceSavedSchema = Schema.Struct({});

const FlowRouteSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(300)
);

const FlowParamKeySchema = Schema.String.check(
  Schema.isPattern(/^[A-Za-z_][\w-]{0,40}$/u)
);

const FlowParamsSchema = Schema.Record(
  FlowParamKeySchema,
  Schema.String.check(Schema.isMaxLength(80))
);

const RouteLinkSchema = Schema.Struct({
  element: Schema.NullOr(
    Schema.Struct({
      selector: Schema.String,
      tag: Schema.String,
      text: Schema.optionalKey(Schema.String),
    })
  ),
  file: Schema.String,
  href: Schema.String,
  kind: Schema.Literals(["link", "push", "form", "redirect"]),
  line: Schema.Number,
  to: Schema.NullOr(Schema.String),
});

const FlowRouteLinksSchema = Schema.Struct({
  file: Schema.NullOr(Schema.String),
  links: Schema.Array(RouteLinkSchema),
  route: Schema.String,
  scanned: Schema.Number,
});

const FlowParamsListSchema = Schema.Struct({ params: Schema.Unknown });

const FlowBuiltSchema = Schema.Struct({
  cut: Schema.Array(Schema.String),
  frames: Schema.Array(Schema.Unknown),
  links: Schema.Array(Schema.Unknown),
  missingParams: Schema.Array(Schema.String),
  params: Schema.Unknown,
  skipped: Schema.Array(Schema.Unknown),
  startFrame: Schema.NullOr(Schema.String),
});

const FrameStatesViewSchema = Schema.Struct({
  frames: Schema.Unknown,
  session: Schema.Unknown,
  states: Schema.Array(Schema.Unknown),
});

const FrameStateSetSchema = Schema.Struct({
  frameId: Schema.String,
  state: Schema.Unknown,
  view: FrameStatesViewSchema,
});

const FrameStateIdSchema = Schema.String.check(
  Schema.isPattern(/^[a-z][a-z0-9-]{0,23}$/u)
);

const MockRuleSchema = Schema.Struct({
  body: Schema.optionalKey(Schema.Unknown),
  delayMs: Schema.optionalKey(
    Schema.Int.check(Schema.isBetween({ maximum: 30_000, minimum: 0 }))
  ),
  method: Schema.optionalKey(
    Schema.String.check(Schema.isPattern(/^[A-Za-z]{3,7}$/u))
  ),
  path: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(300)),
  status: Schema.optionalKey(
    Schema.Int.check(Schema.isBetween({ maximum: 599, minimum: 100 }))
  ),
});

const FrameMockSchema = Schema.Struct({
  name: Schema.optionalKey(
    Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(40))
  ),
  rules: Schema.optionalKey(
    Schema.Array(MockRuleSchema).check(Schema.isMaxLength(40))
  ),
  signedIn: Schema.optionalKey(Schema.Boolean),
});

const MockUserSchema = Schema.Struct({
  email: Schema.String.check(Schema.isMinLength(3), Schema.isMaxLength(120)),
  name: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(80)),
});

export {
  BaseHashSchema,
  CanvasDocSchema,
  CanvasPresenceSavedSchema,
  FlowBuiltSchema,
  FlowParamsListSchema,
  FlowParamsSchema,
  FlowRouteLinksSchema,
  FlowRouteSchema,
  FrameMockSchema,
  FrameStateIdSchema,
  FrameStateSetSchema,
  FrameStatesViewSchema,
  MockUserSchema,
  PresenceFields,
  WriterIdSchema,
  FrameRefSchema,
  ImplicitLinkIdListSchema,
  ImplicitLinkListSchema,
  LinkFileSchema,
  LinkIdSchema,
  LinkKeptSchema,
  LinkListSchema,
  LinkMotionFields,
  LinkSavedSchema,
  LinkSelectorSchema,
};
