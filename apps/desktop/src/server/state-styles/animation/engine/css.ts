import { toEndDeclarations, toFrames } from "./frames.js";
import type {
  AnimationModel,
  AnimationTrack,
  AnimationTrigger,
} from "./types.js";

const MOTION_OK = "@media (prefers-reduced-motion:no-preference)";

const MOTION_REDUCED = "@media (prefers-reduced-motion:reduce)";

const IN_VIEW_RANGE = "entry 0% cover 35%";

const SCROLL_RANGE = "0% 100%";

const toKeyframeName = (model: AnimationModel, index: number): string =>
  `ds-${model.id}-${index}`;

const toKeyframesRule = (
  model: AnimationModel,
  track: AnimationTrack,
  index: number
): string => {
  const frames = toFrames(track, model.durationMs)
    .map(
      (frame) =>
        `${frame.percent}%{${frame.declarations.join(";")};animation-timing-function:${frame.easing}}`
    )
    .join("");

  return `@keyframes ${toKeyframeName(model, index)}{${frames}}`;
};

const toSelector = (
  track: AnimationTrack,
  trigger: AnimationTrigger
): string => {
  if (trigger === "hover") {
    return `${track.selector}:hover`;
  }

  if (trigger === "click") {
    return `${track.selector}:active`;
  }

  return track.selector;
};

const isTimelineTrigger = (trigger: AnimationTrigger): boolean =>
  trigger === "in-view" || trigger === "scroll";

const toIterations = (model: AnimationModel): string => {
  if (model.loop === "once") {
    return "1";
  }

  return "infinite";
};

const toDirection = (model: AnimationModel): string => {
  if (model.loop === "alternate") {
    return "alternate";
  }

  return "normal";
};

const toTimelineRule = (
  model: AnimationModel,
  track: AnimationTrack,
  index: number
): string => {
  const name = toKeyframeName(model, index);
  let timeline = "scroll(root block)";
  let range = SCROLL_RANGE;

  if (model.trigger === "in-view") {
    timeline = "view()";
    range = IN_VIEW_RANGE;
  }

  return `${track.selector}{animation:${name} linear both;animation-timeline:${timeline};animation-range:${range}}`;
};

const toTimedRule = (
  model: AnimationModel,
  track: AnimationTrack,
  index: number
): string => {
  const name = toKeyframeName(model, index);

  const value = [
    name,
    `${model.durationMs}ms`,
    "linear",
    `${track.delayMs}ms`,
    toIterations(model),
    toDirection(model),
    "both",
  ].join(" ");

  return `${toSelector(track, model.trigger)}{animation:${value}}`;
};

const toRule = (
  model: AnimationModel,
  track: AnimationTrack,
  index: number
): string => {
  if (isTimelineTrigger(model.trigger)) {
    return toTimelineRule(model, track, index);
  }

  return toTimedRule(model, track, index);
};

const toReducedRules = (model: AnimationModel): readonly string[] => {
  if (model.trigger === "hover" || model.trigger === "click") {
    return [];
  }

  const rules = model.tracks.map(
    (track) => `${track.selector}{${toEndDeclarations(track).join(";")}}`
  );

  return [`${MOTION_REDUCED}{`, ...rules.map((rule) => `  ${rule}`), "}"];
};

const toAnimationCss = (model: AnimationModel): string => {
  const keyframes = model.tracks.map((track, index) =>
    toKeyframesRule(model, track, index)
  );

  const rules = model.tracks.map((track, index) => toRule(model, track, index));

  return [
    ...keyframes,
    `${MOTION_OK}{`,
    ...rules.map((rule) => `  ${rule}`),
    "}",
    ...toReducedRules(model),
  ].join("\n");
};

export { isTimelineTrigger, toAnimationCss, toKeyframeName };
