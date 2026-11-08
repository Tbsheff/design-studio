import { FRAME_STATE_KINDS } from "@design-studio/contracts/frame-state";
import {
  LINK_DELAY_MAX,
  LINK_EXTRA_ACTIONS,
  LINK_KEY_RE,
  LINK_TRIGGERS,
  LINK_URL_MAX,
  LINK_VISIBILITIES,
} from "@design-studio/contracts/link-interaction";
import {
  LINK_ACTIONS,
  LINK_DURATION_MAX,
  LINK_DURATION_MIN,
  LINK_EASINGS,
  LINK_INTERACTION_ACTIONS,
  LINK_SELECTOR_MAX,
  LINK_TRANSITIONS,
} from "@design-studio/contracts/links";
import { Effect, Schema } from "effect";

import { FrameIdSchema } from "../_core/ids.js";

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

const LinkInteractionFields = {
  action: Schema.optionalKey(
    Schema.Literals(LINK_INTERACTION_ACTIONS).annotate({
      description:
        "navigate, modal or drawer go to toFrame; scroll-to scrolls target into view in the same frame; open-url opens url (https only) in a new tab; close-overlay closes the open modal or drawer; toggle shows or hides target.",
    })
  ),
  delayMs: Schema.optionalKey(
    Schema.Int.check(
      Schema.isBetween({ maximum: LINK_DELAY_MAX, minimum: 0 })
    ).annotate({ description: "Wait in ms for trigger delay." })
  ),
  duration: Schema.optionalKey(
    LinkDurationSchema.annotate({
      description: "Transition length in ms for navigate, modal and drawer.",
    })
  ),
  easing: Schema.optionalKey(
    LinkEasingSchema.annotate({ description: "Transition easing." })
  ),
  fromFrame: Schema.optionalKey(
    FrameRefSchema.annotate({
      description: "Frame id or @label of the frame that has the element.",
    })
  ),
  key: Schema.optionalKey(
    Schema.String.check(Schema.isPattern(LINK_KEY_RE)).annotate({
      description:
        'Key name for trigger key: one character ("k", "/") or a name ("Enter", "Escape", "ArrowRight", "Space").',
    })
  ),
  linkId: Schema.optionalKey(
    LinkIdSchema.annotate({
      description:
        'Id of a saved link from list_link_interactions, for example "l2". Leave out to make a link from fromFrame and selector.',
    })
  ),
  selector: Schema.optionalKey(
    LinkSelectorSchema.annotate({
      description:
        'CSS selector of the source element, for example "#menu-button". Use "body" for a delay trigger on the whole frame.',
    })
  ),
  target: Schema.optionalKey(
    LinkSelectorSchema.annotate({
      description: "CSS selector in the same frame for scroll-to and toggle.",
    })
  ),
  toFrame: Schema.optionalKey(
    FrameRefSchema.annotate({
      description:
        'Frame id or @label for navigate, modal and drawer, or "back" for navigate.',
    })
  ),
  transition: Schema.optionalKey(
    LinkTransitionSchema.annotate({
      description: "Transition for navigate, modal and drawer.",
    })
  ),
  trigger: Schema.optionalKey(
    Schema.Literals(LINK_TRIGGERS).annotate({
      description:
        "click (default), hover (pointer enters), press (pointer down), delay (delayMs after the frame shows) or key (a key press while the frame shows). One element has one link for each trigger.",
    })
  ),
  url: Schema.optionalKey(
    Schema.String.check(Schema.isMaxLength(LINK_URL_MAX)).annotate({
      description: "https URL for open-url.",
    })
  ),
  visibility: Schema.optionalKey(
    Schema.Literals(LINK_VISIBILITIES).annotate({
      description: "For toggle: toggle (default), show or hide the target.",
    })
  ),
} as const;

const LinkInteractionListFields = {
  fromFrame: Schema.optionalKey(
    FrameRefSchema.annotate({
      description:
        "Frame id or @label. Leave out for the links of every frame.",
    })
  ),
} as const;

const LinkSourceSchema = Schema.Struct({
  frame: Schema.String,
  label: Schema.optionalKey(Schema.String),
  path: Schema.String,
  selector: Schema.String,
  tag: Schema.optionalKey(Schema.String),
  text: Schema.optionalKey(Schema.String),
});

const LinkTargetSchema = Schema.Union([
  Schema.Struct({ frame: Schema.String }),
  Schema.Struct({ back: Schema.Literal(true) }),
  Schema.Struct({
    selector: Schema.String,
    visibility: Schema.optionalKey(Schema.Literals(["show", "hide"])),
  }),
  Schema.Struct({ url: Schema.String }),
  Schema.Struct({ close: Schema.Literal(true) }),
]);

const LinkTriggerSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("hover") }),
  Schema.Struct({ kind: Schema.Literal("press") }),
  Schema.Struct({ kind: Schema.Literal("delay"), ms: Schema.Number }),
  Schema.Struct({ key: Schema.String, kind: Schema.Literal("key") }),
]);

const PrototypeLinkSchema = Schema.Struct({
  action: Schema.optionalKey(
    Schema.Literals(["modal", "drawer", ...LINK_EXTRA_ACTIONS])
  ),
  duration: Schema.optionalKey(Schema.Number),
  easing: Schema.optionalKey(LinkEasingSchema),
  from: LinkSourceSchema,
  id: Schema.String,
  implicit: Schema.optionalKey(Schema.Literal(true)),
  to: LinkTargetSchema,
  transition: LinkTransitionSchema,
  trigger: Schema.optionalKey(LinkTriggerSchema),
});

const LinksFileSchema = Schema.Struct({
  links: Schema.Array(PrototypeLinkSchema),
  start: Schema.optionalKey(Schema.String),
  version: Schema.Number,
});

const LinkListSchema = Schema.Struct({
  items: Schema.Array(Schema.Unknown),
  links: LinksFileSchema,
  note: Schema.NullOr(Schema.String),
  startFrame: Schema.String,
});

const ImplicitLinkListSchema = Schema.Struct({
  implicit: Schema.Array(PrototypeLinkSchema),
});

const LinkSavedSchema = Schema.Struct({
  link: Schema.NullOr(PrototypeLinkSchema),
  links: LinksFileSchema,
  title: Schema.NullOr(Schema.String),
});

const LinkKeptSchema = Schema.Struct({
  kept: Schema.Array(Schema.Unknown),
  links: LinksFileSchema,
});

const LinkFileSchema = Schema.Struct({
  links: LinksFileSchema,
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

const SavedMockRuleSchema = Schema.Struct({
  body: Schema.optionalKey(Schema.Unknown),
  delayMs: Schema.optionalKey(Schema.Number),
  method: Schema.optionalKey(Schema.String),
  path: Schema.String,
  status: Schema.optionalKey(Schema.Number),
});

const FrameStateDefSchema = Schema.Struct({
  id: Schema.String,
  kind: Schema.Literals(FRAME_STATE_KINDS),
  mocks: Schema.optionalKey(Schema.Array(SavedMockRuleSchema)),
  name: Schema.String,
  signedIn: Schema.Boolean,
});

const FrameSessionInfoSchema = Schema.Struct({
  captured: Schema.Array(Schema.String),
  capturedAt: Schema.NullOr(Schema.Number),
  user: Schema.Struct({ email: Schema.String, name: Schema.String }),
  usesMockUser: Schema.Boolean,
});

const FrameStatesViewSchema = Schema.Struct({
  frames: Schema.Record(Schema.String, Schema.String),
  session: FrameSessionInfoSchema,
  states: Schema.Array(FrameStateDefSchema),
});

const FrameStateSetSchema = Schema.Struct({
  frameId: Schema.String,
  state: FrameStateDefSchema,
  view: FrameStatesViewSchema,
});

const FLOW_STEPS_MAX = 20;

const FLOW_STEPS_DEFAULT = 8;

const FLOW_WIDTH_DEFAULT = 1440;

const FLOW_STEP_MS_DEFAULT = 1200;

const FlowVideoFormatSchema = Schema.Literals(["webm", "mp4", "gif"]);

const FlowVideoStepSchema = Schema.Struct({
  atMs: Schema.Int,
  frameId: Schema.String,
  index: Schema.Int,
  linkId: Schema.NullOr(Schema.String),
  selector: Schema.NullOr(Schema.String),
});

const FlowBrokenLinkSchema = Schema.Struct({
  linkId: Schema.String,
  reason: Schema.String,
});

const FlowVideoResultSchema = Schema.Struct({
  brokenLinks: Schema.Array(FlowBrokenLinkSchema),
  bytes: Schema.Int,
  durationMs: Schema.Int,
  mediaType: Schema.String,
  path: Schema.String,
  steps: Schema.Array(FlowVideoStepSchema),
});

const FlowVideoFields = {
  format: FlowVideoFormatSchema.annotate({
    description: "webm, mp4 or gif. Default webm. mp4 and gif need ffmpeg.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed("webm" as const))),
  linkIds: Schema.NullOr(
    Schema.Array(Schema.String).check(Schema.isMaxLength(FLOW_STEPS_MAX))
  )
    .annotate({
      description:
        "Link ids from list_links in click order. Leave null to follow the first click link of each frame.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  maxSteps: Schema.Int.check(
    Schema.isBetween({ maximum: FLOW_STEPS_MAX, minimum: 1 })
  )
    .annotate({ description: "Most clicks to record, 1 to 20. Default 8." })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(FLOW_STEPS_DEFAULT))),
  startFrameId: Schema.NullOr(FrameIdSchema)
    .annotate({
      description:
        "Frame where the video starts. Leave null for the start frame, or the first frame.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  stepMs: Schema.Int.check(Schema.isBetween({ maximum: 5000, minimum: 400 }))
    .annotate({ description: "Time for each click in ms, 400 to 5000." })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(FLOW_STEP_MS_DEFAULT))),
  width: Schema.Int.check(Schema.isBetween({ maximum: 3840, minimum: 320 }))
    .annotate({ description: "Video width in pixels. Default 1440." })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(FLOW_WIDTH_DEFAULT))),
} as const;

type FlowVideoResult = typeof FlowVideoResultSchema.Type;

type FlowVideoStep = typeof FlowVideoStepSchema.Type;

type FlowBrokenLink = typeof FlowBrokenLinkSchema.Type;

export {
  BaseHashSchema,
  FlowBrokenLinkSchema,
  FlowVideoFields,
  FlowVideoFormatSchema,
  FlowVideoResultSchema,
  FlowVideoStepSchema,
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
  LinkInteractionFields,
  LinkInteractionListFields,
  LinkKeptSchema,
  LinkListSchema,
  LinkMotionFields,
  LinkSavedSchema,
  LinkSelectorSchema,
};

export type { FlowBrokenLink, FlowVideoResult, FlowVideoStep };
