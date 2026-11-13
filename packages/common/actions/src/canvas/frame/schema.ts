import { Schema } from "effect";

import { DirectionIdSchema } from "../../_core/ids.js";
import { GuideSchema } from "../guide/schema.js";

const FRAME_REF_FIELD_MAX = 60;

const FRAME_LABEL_MAX = 40;

const FRAME_PATH_MAX = 200;

const FRAME_ROUTE_MAX = 300;

const FRAME_GAP_MAX = 2000;

const FRAME_SIDE_MIN = 200;

const FRAME_SIDE_MAX = 4000;

const FRAME_BATCH_MAX = 12;

const POINT_SELECTOR_MAX = 400;

const FRAME_PAGE_PATH_MAX = 300;

const VIEWPORT_TEXT =
  "desktop 1440x900, tablet 768x1024 or mobile 390x844. Default desktop.";

const FrameNameSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(FRAME_REF_FIELD_MAX)
);

const FrameSideRange = Schema.isBetween({
  maximum: FRAME_SIDE_MAX,
  minimum: FRAME_SIDE_MIN,
});

const FrameSideSchema = Schema.Int.check(FrameSideRange);

const FrameGapRange = Schema.isBetween({ maximum: FRAME_GAP_MAX, minimum: 0 });

const FrameLabelLimit = Schema.isMaxLength(FRAME_LABEL_MAX);

const FrameLabelSchema = Schema.String.check(FrameLabelLimit);

const FramePathSchema = Schema.String.check(Schema.isMaxLength(FRAME_PATH_MAX));

const FrameViewportSchema = Schema.Literals(["desktop", "tablet", "mobile"]);

const FrameDirectionField = {
  directionId: Schema.optionalKey(
    DirectionIdSchema.annotate({
      description: "Direction id. Leave out for the main direction.",
    })
  ),
} as const;

const PlaceFrameSchema = Schema.Struct({
  above: Schema.optionalKey(FrameNameSchema),
  below: Schema.optionalKey(
    FrameNameSchema.annotate({
      description:
        "Put the frame under this frame (id or @label), left edges lined up.",
    })
  ),
  frame: Schema.optionalKey(
    FrameNameSchema.annotate({
      description:
        "Id or @label of a frame to move or change. Leave out to add a new frame.",
    })
  ),
  gap: Schema.optionalKey(
    Schema.Int.check(FrameGapRange).annotate({
      description: "Space between the frames in px. Default 80.",
    })
  ),
  height: Schema.optionalKey(FrameSideSchema),
  hidden: Schema.optionalKey(Schema.Boolean),
  label: Schema.optionalKey(
    FrameLabelSchema.annotate({
      description:
        'Short name shown on the frame label, for example "Empty" or "Pricing".',
    })
  ),
  leftOf: Schema.optionalKey(FrameNameSchema),
  path: Schema.optionalKey(
    FramePathSchema.annotate({
      description:
        'Page the frame shows, relative to the project root, for example "states/empty.html". Empty string = the entry page.',
    })
  ),
  rightOf: Schema.optionalKey(
    FrameNameSchema.annotate({
      description:
        "Put the frame to the right of this frame, top edges lined up.",
    })
  ),
  viewport: Schema.optionalKey(
    FrameViewportSchema.annotate({
      description:
        "Frame size preset: desktop 1440x900, tablet 768x1024, mobile 390x844.",
    })
  ),
  width: Schema.optionalKey(FrameSideSchema),
  x: Schema.optionalKey(
    Schema.Int.annotate({
      description: "Absolute canvas x. Overrides the relative x.",
    })
  ),
  y: Schema.optionalKey(
    Schema.Int.annotate({
      description: "Absolute canvas y. Overrides the relative y.",
    })
  ),
});

const PlaceFrameListSchema = Schema.Array(PlaceFrameSchema).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(FRAME_BATCH_MAX)
);

const FramePointFields = {
  frame: FrameNameSchema.annotate({ description: "Frame id or @label." }),
  selector: Schema.optionalKey(
    Schema.String.check(Schema.isMaxLength(POINT_SELECTOR_MAX))
  ),
} as const;

const FrameAddFields = {
  below: Schema.optionalKey(
    FrameNameSchema.annotate({
      description: "Put the new frame under this frame (id or @label).",
    })
  ),
  height: Schema.optionalKey(FrameSideSchema),
  label: Schema.optionalKey(
    FrameLabelSchema.annotate({
      description: 'Short frame name, for example "Empty state".',
    })
  ),
  path: Schema.optionalKey(
    Schema.String.check(Schema.isMaxLength(FRAME_PAGE_PATH_MAX)).annotate({
      description:
        'Page path in the project, for example "about.html". Leave out for the entry page.',
    })
  ),
  rightOf: Schema.optionalKey(
    FrameNameSchema.annotate({
      description:
        "Put the new frame to the right of this frame (id or @label).",
    })
  ),
  viewport: Schema.optionalKey(
    FrameViewportSchema.annotate({ description: VIEWPORT_TEXT })
  ),
  width: Schema.optionalKey(FrameSideSchema),
} as const;

const FrameRouteFields = {
  below: Schema.optionalKey(FrameNameSchema),
  label: Schema.optionalKey(FrameLabelSchema),
  rightOf: Schema.optionalKey(FrameNameSchema),
  route: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(FRAME_ROUTE_MAX)
  ).annotate({
    description:
      'App route from list_routes with the dynamic segments filled in, for example "/design-system" or "/patients/123".',
  }),
  viewport: Schema.optionalKey(
    FrameViewportSchema.annotate({ description: VIEWPORT_TEXT })
  ),
} as const;

const FrameViewSchema = Schema.Struct({
  direction: Schema.String,
  height: Schema.Int,
  hidden: Schema.optionalKey(Schema.Boolean),
  id: Schema.String,
  label: Schema.NullOr(Schema.String),
  page: Schema.String,
  width: Schema.Int,
  x: Schema.Int,
  y: Schema.Int,
});

const CanvasSectionViewSchema = Schema.Struct({
  height: Schema.Int,
  id: Schema.String,
  label: Schema.String,
  width: Schema.Int,
  x: Schema.Int,
  y: Schema.Int,
});

const CanvasUserViewSchema = Schema.Struct({
  currentDirection: Schema.NullOr(Schema.String),
  inView: Schema.Array(Schema.String),
  liveFrame: Schema.NullOr(Schema.String),
  note: Schema.NullOr(Schema.String),
  selection: Schema.Array(
    Schema.Struct({
      selector: Schema.String,
      tag: Schema.String,
      text: Schema.String,
    })
  ),
});

const CanvasListedSchema = Schema.Struct({
  frames: Schema.Array(FrameViewSchema),
  guides: Schema.Array(GuideSchema),
  lofi: Schema.Array(Schema.String),
  note: Schema.NullOr(Schema.String),
  sections: Schema.Array(CanvasSectionViewSchema),
  thisRun: Schema.Struct({ direction: Schema.String }),
  user: CanvasUserViewSchema,
});

const FramesPlacedSchema = Schema.Struct({
  frames: Schema.Int,
  placed: Schema.Array(FrameViewSchema),
  warnings: Schema.Array(Schema.String),
});

const FramePointedSchema = Schema.Struct({
  badge: Schema.Boolean,
  frame: Schema.String,
  label: Schema.NullOr(Schema.String),
  note: Schema.String,
  page: Schema.String,
  selector: Schema.optionalKey(Schema.String),
  shown: Schema.Boolean,
});

const FrameRemovedSchema = Schema.Struct({
  note: Schema.String,
  removed: Schema.String,
});

const FRAME_DELETE_MAX = 50;

const FrameDeleteListSchema = Schema.Array(FrameNameSchema).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(FRAME_DELETE_MAX)
);

const RemovedFrameSchema = Schema.Struct({
  id: Schema.String,
  label: Schema.NullOr(Schema.String),
});

const FramesRemovedSchema = Schema.Struct({
  note: Schema.String,
  removedFrames: Schema.Array(RemovedFrameSchema),
});

export {
  CanvasListedSchema,
  FrameAddFields,
  FrameDeleteListSchema,
  FrameDirectionField,
  FramePointFields,
  FramePointedSchema,
  FrameRemovedSchema,
  FrameRouteFields,
  FrameViewSchema,
  FrameNameSchema,
  FramesPlacedSchema,
  FramesRemovedSchema,
  PlaceFrameListSchema,
};
