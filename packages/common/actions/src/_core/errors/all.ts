// @generated
import type { AccessibilityError } from "../../accessibility/errors/index.js";
import type { AnimationError } from "../../animation/errors/index.js";
import type { CommentError } from "../../comment/errors/index.js";
import type { ContentError } from "../../content/errors/index.js";
import type { CritiqueError } from "../../critique/errors/index.js";
import type { DirectEditError } from "../../direct-edit/errors/index.js";
import type { FillError } from "../../fill/errors/index.js";
import type { GalleryError } from "../../gallery/errors/index.js";
import type { IconError } from "../../icon/errors/index.js";
import type { ImageError } from "../../image/errors/index.js";
import type { MotionError } from "../../motion/errors/index.js";
import type { PackError } from "../../pack/errors/index.js";
import type { PropError } from "../../prop/errors/index.js";
import type { PublishError } from "../../publish/errors/index.js";
import type { ScenarioError } from "../../scenario/errors/index.js";
import type { SpacingError } from "../../spacing/errors/index.js";
import type { StackingError } from "../../stacking/errors/index.js";
import type { StateStyleError } from "../../state-style/errors/index.js";
import type { TextStyleError } from "../../text-style/errors/index.js";
import type { TextError } from "../../text/errors/index.js";
import type { TokenError } from "../../token/errors/index.js";
import type { ViewportError } from "../../viewport/errors/index.js";
import type { CoreError } from "./index.js";

type StudioError =
  | CoreError
  | AccessibilityError
  | AnimationError
  | CommentError
  | ContentError
  | CritiqueError
  | DirectEditError
  | FillError
  | GalleryError
  | IconError
  | ImageError
  | MotionError
  | PackError
  | PropError
  | PublishError
  | ScenarioError
  | SpacingError
  | StackingError
  | StateStyleError
  | TextError
  | TextStyleError
  | TokenError
  | ViewportError;

type StudioErrorTag = StudioError["_tag"];

export type { StudioError, StudioErrorTag };
