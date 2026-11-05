// @generated
import type { AnimationError } from "../../animation/errors/index.js";
import type { CommentError } from "../../comment/errors/index.js";
import type { ContentError } from "../../content/errors/index.js";
import type { CritiqueError } from "../../critique/errors/index.js";
import type { DirectEditError } from "../../direct-edit/errors/index.js";
import type { FillError } from "../../fill/errors/index.js";
import type { GalleryError } from "../../gallery/errors/index.js";
import type { ImageError } from "../../image/errors/index.js";
import type { MotionError } from "../../motion/errors/index.js";
import type { PackError } from "../../pack/errors/index.js";
import type { PropError } from "../../prop/errors/index.js";
import type { PublishError } from "../../publish/errors/index.js";
import type { ScenarioError } from "../../scenario/errors/index.js";
import type { SpacingError } from "../../spacing/errors/index.js";
import type { TokenError } from "../../token/errors/index.js";
import type { ViewportError } from "../../viewport/errors/index.js";
import type { CoreError } from "./index.js";

type StudioError =
  | CoreError
  | AnimationError
  | CommentError
  | ContentError
  | CritiqueError
  | DirectEditError
  | FillError
  | GalleryError
  | ImageError
  | MotionError
  | PackError
  | PropError
  | PublishError
  | ScenarioError
  | SpacingError
  | TokenError
  | ViewportError;

type StudioErrorTag = StudioError["_tag"];

export type { StudioError, StudioErrorTag };
