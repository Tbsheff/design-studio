// @generated
import { AccessibilityStatus } from "../accessibility/errors/status.js";
import { AnimationStatus } from "../animation/errors/status.js";
import { CommentStatus } from "../comment/errors/status.js";
import { ComponentVariantStatus } from "../component-variant/errors/status.js";
import { ContentStatus } from "../content/errors/status.js";
import { CritiqueStatus } from "../critique/errors/status.js";
import { DirectEditStatus } from "../direct-edit/errors/status.js";
import { EffectStatus } from "../effect/errors/status.js";
import { FillStatus } from "../fill/errors/status.js";
import { GalleryStatus } from "../gallery/errors/status.js";
import { GridStatus } from "../grid/errors/status.js";
import { IconStatus } from "../icon/errors/status.js";
import { ImageSearchStatus } from "../image-search/errors/status.js";
import { ImageStatus } from "../image/errors/status.js";
import { MotionStatus } from "../motion/errors/status.js";
import { PackStatus } from "../pack/errors/status.js";
import { PageStatus } from "../page/errors/status.js";
import { PatternStatus } from "../pattern/errors/status.js";
import { PropStatus } from "../prop/errors/status.js";
import { PublishStatus } from "../publish/errors/status.js";
import { ScenarioStatus } from "../scenario/errors/status.js";
import { SpacingStatus } from "../spacing/errors/status.js";
import { StackingStatus } from "../stacking/errors/status.js";
import { StateStyleStatus } from "../state-style/errors/status.js";
import { TextStyleStatus } from "../text-style/errors/status.js";
import { TextStatus } from "../text/errors/status.js";
import { TokenStatus } from "../token/errors/status.js";
import { ViewportStatus } from "../viewport/errors/status.js";
import type { StudioErrorTag } from "./errors/all.js";
import type { HttpStatus } from "./errors/http-status-codes.js";
import { CoreStatus } from "./errors/status.js";

const HTTP_STATUS = {
  ...CoreStatus,
  ...AccessibilityStatus,
  ...AnimationStatus,
  ...CommentStatus,
  ...ComponentVariantStatus,
  ...ContentStatus,
  ...CritiqueStatus,
  ...DirectEditStatus,
  ...EffectStatus,
  ...FillStatus,
  ...GalleryStatus,
  ...GridStatus,
  ...IconStatus,
  ...ImageStatus,
  ...ImageSearchStatus,
  ...MotionStatus,
  ...PackStatus,
  ...PageStatus,
  ...PatternStatus,
  ...PropStatus,
  ...PublishStatus,
  ...ScenarioStatus,
  ...SpacingStatus,
  ...StackingStatus,
  ...StateStyleStatus,
  ...TextStatus,
  ...TextStyleStatus,
  ...TokenStatus,
  ...ViewportStatus,
  Defect: 500,
} as const satisfies Record<StudioErrorTag | "Defect", HttpStatus>;

const statusOf = (tag: StudioErrorTag | "Defect"): HttpStatus =>
  HTTP_STATUS[tag];

export { HTTP_STATUS, statusOf };
