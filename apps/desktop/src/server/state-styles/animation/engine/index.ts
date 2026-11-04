export { isHtmlFile, setCssRegion, setHtmlBlock } from "./block.js";

export { isTimelineTrigger, toAnimationCss } from "./css.js";

export { toEndDeclarations, toFrames, toTimelineMs } from "./frames.js";

export { toReactSource } from "./react.js";

export { toAnimationId, toComponentName, toSlug } from "./slug.js";

export { getAnimationProblem } from "./validate.js";

export type {
  AnimationKeyframe,
  AnimationLoop,
  AnimationModel,
  AnimationPropertyTrack,
  AnimationTrack,
  AnimationTrigger,
  FrameDraft,
} from "./types.js";
