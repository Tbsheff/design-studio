// @generated
import { AccessibilityStatus } from "../accessibility/errors/status.js";
import { AnimationStatus } from "../animation/errors/status.js";
import { BlockStatus } from "../block/errors/status.js";
import { BriefStatus } from "../brief/errors/status.js";
import { ChartStatus } from "../chart/errors/status.js";
import { CommentStatus } from "../comment/errors/status.js";
import { CompletionStatus } from "../completion/errors/status.js";
import { ComponentVariantStatus } from "../component-variant/errors/status.js";
import { ComponentStatus } from "../component/errors/status.js";
import { ContentStatus } from "../content/errors/status.js";
import { CritiqueStatus } from "../critique/errors/status.js";
import { DataModelStatus } from "../data-model/errors/status.js";
import { DesignRuleStatus } from "../design-rule/errors/status.js";
import { DevNoteStatus } from "../dev-note/errors/status.js";
import { DevStatusStatus } from "../dev-status/errors/status.js";
import { DirectEditStatus } from "../direct-edit/errors/status.js";
import { EffectStatus } from "../effect/errors/status.js";
import { FileLockStatus } from "../file-lock/errors/status.js";
import { FillStatus } from "../fill/errors/status.js";
import { FixtureStatus } from "../fixture/errors/status.js";
import { FontStatus } from "../font/errors/status.js";
import { GalleryStatus } from "../gallery/errors/status.js";
import { GridStatus } from "../grid/errors/status.js";
import { IconStatus } from "../icon/errors/status.js";
import { ImageSearchStatus } from "../image-search/errors/status.js";
import { ImageStatus } from "../image/errors/status.js";
import { ImpactStatus } from "../impact/errors/status.js";
import { IntegrationStatus } from "../integration/errors/status.js";
import { KitDriftStatus } from "../kit-drift/errors/status.js";
import { LayerStyleStatus } from "../layer-style/errors/status.js";
import { LayerStatus } from "../layer/errors/status.js";
import { MarkupStatus } from "../markup/errors/status.js";
import { MockupStatus } from "../mockup/errors/status.js";
import { MotionStatus } from "../motion/errors/status.js";
import { PackStatus } from "../pack/errors/status.js";
import { PageStatus } from "../page/errors/status.js";
import { PatternStatus } from "../pattern/errors/status.js";
import { PortStatus } from "../port/errors/status.js";
import { PropStatus } from "../prop/errors/status.js";
import { PublishStatus } from "../publish/errors/status.js";
import { ReferenceStatus } from "../reference/errors/status.js";
import { ScenarioStatus } from "../scenario/errors/status.js";
import { ScreenStatus } from "../screen/errors/status.js";
import { SpacingStatus } from "../spacing/errors/status.js";
import { SpeedStatus } from "../speed/errors/status.js";
import { SpellingStatus } from "../spelling/errors/status.js";
import { StackingStatus } from "../stacking/errors/status.js";
import { StateStyleStatus } from "../state-style/errors/status.js";
import { SuggestionStatus } from "../suggestion/errors/status.js";
import { TextStyleStatus } from "../text-style/errors/status.js";
import { TextStatus } from "../text/errors/status.js";
import { ThemeStatus } from "../theme/errors/status.js";
import { TokenStatus } from "../token/errors/status.js";
import { VariationStatus } from "../variation/errors/status.js";
import { ViewportStatus } from "../viewport/errors/status.js";
import { WalkthroughStatus } from "../walkthrough/errors/status.js";
import type { StudioErrorTag } from "./errors/all.js";
import type { HttpStatus } from "./errors/http-status-codes.js";
import { CoreStatus } from "./errors/status.js";

const HTTP_STATUS = {
  ...CoreStatus,
  ...AccessibilityStatus,
  ...AnimationStatus,
  ...BlockStatus,
  ...BriefStatus,
  ...ChartStatus,
  ...CommentStatus,
  ...CompletionStatus,
  ...ComponentStatus,
  ...ComponentVariantStatus,
  ...ContentStatus,
  ...CritiqueStatus,
  ...DataModelStatus,
  ...DesignRuleStatus,
  ...DevNoteStatus,
  ...DevStatusStatus,
  ...DirectEditStatus,
  ...EffectStatus,
  ...FileLockStatus,
  ...FillStatus,
  ...FixtureStatus,
  ...FontStatus,
  ...GalleryStatus,
  ...GridStatus,
  ...IconStatus,
  ...ImageStatus,
  ...ImageSearchStatus,
  ...ImpactStatus,
  ...IntegrationStatus,
  ...KitDriftStatus,
  ...LayerStatus,
  ...LayerStyleStatus,
  ...MarkupStatus,
  ...MockupStatus,
  ...MotionStatus,
  ...PackStatus,
  ...PageStatus,
  ...PatternStatus,
  ...PortStatus,
  ...PropStatus,
  ...PublishStatus,
  ...ReferenceStatus,
  ...ScenarioStatus,
  ...ScreenStatus,
  ...SpacingStatus,
  ...SpeedStatus,
  ...SpellingStatus,
  ...StackingStatus,
  ...StateStyleStatus,
  ...SuggestionStatus,
  ...TextStatus,
  ...TextStyleStatus,
  ...ThemeStatus,
  ...TokenStatus,
  ...VariationStatus,
  ...ViewportStatus,
  ...WalkthroughStatus,
  Defect: 500,
} as const satisfies Record<StudioErrorTag | "Defect", HttpStatus>;

const statusOf = (tag: StudioErrorTag | "Defect"): HttpStatus =>
  HTTP_STATUS[tag];

export { HTTP_STATUS, statusOf };
