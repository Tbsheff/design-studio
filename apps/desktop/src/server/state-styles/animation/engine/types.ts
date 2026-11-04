type AnimationTrigger = "click" | "hover" | "in-view" | "load" | "scroll";

type AnimationLoop = "alternate" | "infinite" | "once";

interface AnimationKeyframe {
  readonly easing: string;
  readonly timeMs: number;
  readonly value: string;
}

interface AnimationPropertyTrack {
  readonly keyframes: readonly AnimationKeyframe[];
  readonly property: string;
}

interface AnimationTrack {
  readonly delayMs: number;
  readonly properties: readonly AnimationPropertyTrack[];
  readonly selector: string;
}

interface AnimationModel {
  readonly durationMs: number;
  readonly file: string;
  readonly id: string;
  readonly loop: AnimationLoop;
  readonly name: string;
  readonly tracks: readonly AnimationTrack[];
  readonly trigger: AnimationTrigger;
}

interface FrameDraft {
  readonly declarations: readonly string[];
  readonly easing: string;
  readonly percent: number;
}

export type {
  AnimationKeyframe,
  AnimationLoop,
  AnimationModel,
  AnimationPropertyTrack,
  AnimationTrack,
  AnimationTrigger,
  FrameDraft,
};
