// @generated
import type { AccessibilityError } from "../../accessibility/errors/index.js";
import type { AnimationError } from "../../animation/errors/index.js";
import type { BlockError } from "../../block/errors/index.js";
import type { BriefError } from "../../brief/errors/index.js";
import type { ChartError } from "../../chart/errors/index.js";
import type { CommentError } from "../../comment/errors/index.js";
import type { CompletionError } from "../../completion/errors/index.js";
import type { ComponentVariantError } from "../../component-variant/errors/index.js";
import type { ContentError } from "../../content/errors/index.js";
import type { CritiqueError } from "../../critique/errors/index.js";
import type { DataModelError } from "../../data-model/errors/index.js";
import type { DevNoteError } from "../../dev-note/errors/index.js";
import type { DevStatusError } from "../../dev-status/errors/index.js";
import type { DirectEditError } from "../../direct-edit/errors/index.js";
import type { EffectError } from "../../effect/errors/index.js";
import type { FillError } from "../../fill/errors/index.js";
import type { FixtureError } from "../../fixture/errors/index.js";
import type { GalleryError } from "../../gallery/errors/index.js";
import type { GridError } from "../../grid/errors/index.js";
import type { IconError } from "../../icon/errors/index.js";
import type { ImageSearchError } from "../../image-search/errors/index.js";
import type { ImageError } from "../../image/errors/index.js";
import type { IntegrationError } from "../../integration/errors/index.js";
import type { KitDriftError } from "../../kit-drift/errors/index.js";
import type { LayerStyleError } from "../../layer-style/errors/index.js";
import type { MotionError } from "../../motion/errors/index.js";
import type { PackError } from "../../pack/errors/index.js";
import type { PageError } from "../../page/errors/index.js";
import type { PatternError } from "../../pattern/errors/index.js";
import type { PropError } from "../../prop/errors/index.js";
import type { PublishError } from "../../publish/errors/index.js";
import type { ReferenceDomainError } from "../../reference/errors/index.js";
import type { ScenarioError } from "../../scenario/errors/index.js";
import type { ScreenError } from "../../screen/errors/index.js";
import type { SpacingError } from "../../spacing/errors/index.js";
import type { StackingError } from "../../stacking/errors/index.js";
import type { StateStyleError } from "../../state-style/errors/index.js";
import type { TextStyleError } from "../../text-style/errors/index.js";
import type { TextError } from "../../text/errors/index.js";
import type { ThemeError } from "../../theme/errors/index.js";
import type { TokenError } from "../../token/errors/index.js";
import type { ViewportError } from "../../viewport/errors/index.js";
import type { WalkthroughError } from "../../walkthrough/errors/index.js";
import type { CoreError } from "./index.js";

type StudioError =
  | CoreError
  | AccessibilityError
  | AnimationError
  | BlockError
  | BriefError
  | ChartError
  | CommentError
  | CompletionError
  | ComponentVariantError
  | ContentError
  | CritiqueError
  | DataModelError
  | DevNoteError
  | DevStatusError
  | DirectEditError
  | EffectError
  | FillError
  | FixtureError
  | GalleryError
  | GridError
  | IconError
  | ImageError
  | ImageSearchError
  | IntegrationError
  | KitDriftError
  | LayerStyleError
  | MotionError
  | PackError
  | PageError
  | PatternError
  | PropError
  | PublishError
  | ReferenceDomainError
  | ScenarioError
  | ScreenError
  | SpacingError
  | StackingError
  | StateStyleError
  | TextError
  | TextStyleError
  | ThemeError
  | TokenError
  | ViewportError
  | WalkthroughError;

type StudioErrorTag = StudioError["_tag"];

export type { StudioError, StudioErrorTag };
