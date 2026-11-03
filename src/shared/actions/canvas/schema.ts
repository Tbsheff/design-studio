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

export {
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
