import { toEndDeclarations, toFrames } from "./frames.js";
import { toComponentName } from "./slug.js";
import type { AnimationModel, AnimationTrack, FrameDraft } from "./types.js";

const FULL = 100;

const toCamel = (property: string): string =>
  property.replaceAll(/-(?<letter>[a-z])/gu, (_match: string, letter: string) =>
    letter.toUpperCase()
  );

const toDeclarationEntries = (lines: readonly string[]): [string, string][] =>
  lines.map((line) => {
    const at = line.indexOf(":");

    return [toCamel(line.slice(0, at).replace(/^-/u, "")), line.slice(at + 1)];
  });

const toKeyframeData = (frame: FrameDraft): Record<string, number | string> =>
  Object.fromEntries([
    ["easing", frame.easing],
    ["offset", frame.percent / FULL],
    ...toDeclarationEntries(frame.declarations),
  ]);

interface TrackData {
  readonly delayMs: number;
  readonly end: Readonly<Record<string, string>>;
  readonly keyframes: readonly Readonly<Record<string, number | string>>[];
  readonly selector: string;
}

const toTrackData = (
  model: AnimationModel,
  track: AnimationTrack
): TrackData => ({
  delayMs: track.delayMs,
  end: Object.fromEntries(toDeclarationEntries(toEndDeclarations(track))),
  keyframes: toFrames(track, model.durationMs).map((frame) =>
    toKeyframeData(frame)
  ),
  selector: track.selector,
});

const RUNTIME = String.raw`type Track = (typeof TRACKS)[number];

type Scope = Record<string, new (init: object) => AnimationTimeline>;

const toTimeline = (element: Element): Record<string, unknown> | null => {
  const scope = window as unknown as Scope;

  if (TRIGGER === "scroll" && scope.ScrollTimeline) {
    return {
      rangeEnd: "100%",
      rangeStart: "0%",
      timeline: new scope.ScrollTimeline({ source: document.scrollingElement }),
    };
  }

  if (TRIGGER === "in-view" && scope.ViewTimeline) {
    return {
      rangeEnd: "cover 35%",
      rangeStart: "entry 0%",
      timeline: new scope.ViewTimeline({ subject: element }),
    };
  }

  return null;
};

const toTiming = (element: Element, track: Track): KeyframeAnimationOptions => {
  const linked = toTimeline(element);

  if (linked) {
    return { easing: "linear", fill: "both", ...linked } as KeyframeAnimationOptions;
  }

  return {
    delay: track.delayMs,
    direction: LOOP === "alternate" ? "alternate" : "normal",
    duration: DURATION_MS,
    easing: "linear",
    fill: "both",
    iterations: LOOP === "once" ? 1 : Infinity,
  };
};

const play = (element: Element, track: Track): Animation =>
  element.animate(track.keyframes, toTiming(element, track));

const settle = (element: Element, track: Track): void => {
  if (TRIGGER === "hover" || TRIGGER === "click") {
    return;
  }

  Object.assign((element as HTMLElement).style, track.end);
};

const bindPress = (
  element: Element,
  track: Track,
  start: string,
  stops: string[]
): (() => void) => {
  let current: Animation | null = null;

  const stop = (): void => {
    current?.cancel();
    current = null;
  };

  const run = (): void => {
    stop();
    current = play(element, track);
  };

  element.addEventListener(start, run);

  for (const name of stops) {
    element.addEventListener(name, stop);
  }

  return () => {
    stop();
    element.removeEventListener(start, run);

    for (const name of stops) {
      element.removeEventListener(name, stop);
    }
  };
};

const bindInView = (element: Element, track: Track): (() => void) => {
  let current: Animation | null = null;

  const watcher = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting) && current === null) {
      current = play(element, track);
      watcher.disconnect();
    }
  });

  watcher.observe(element);

  return () => {
    watcher.disconnect();
    current?.cancel();
  };
};

const start = (element: Element, track: Track): (() => void) => {
  if (TRIGGER === "hover") {
    return bindPress(element, track, "pointerenter", ["pointerleave"]);
  }

  if (TRIGGER === "click") {
    return bindPress(element, track, "pointerdown", ["pointerup", "pointerleave"]);
  }

  if (TRIGGER === "in-view" && !toTimeline(element)) {
    return bindInView(element, track);
  }

  const running = play(element, track);

  return () => running.cancel();
};`;

const toReactSource = (model: AnimationModel): string => {
  const tracks = JSON.stringify(
    model.tracks.map((track) => toTrackData(model, track)),
    null,
    2
  );

  const component = toComponentName(model.name);

  return [
    'import { useEffect } from "react";',
    "",
    `const DURATION_MS = ${model.durationMs};`,
    "",
    `const TRIGGER: string = ${JSON.stringify(model.trigger)};`,
    "",
    `const LOOP: string = ${JSON.stringify(model.loop)};`,
    "",
    `const TRACKS = ${tracks};`,
    "",
    RUNTIME,
    "",
    `export function ${component}() {`,
    "  useEffect(() => {",
    "    const stops: (() => void)[] = [];",
    '    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;',
    "",
    "    for (const track of TRACKS) {",
    "      for (const element of document.querySelectorAll(track.selector)) {",
    "        if (isReduced) {",
    "          settle(element, track);",
    "        } else {",
    "          stops.push(start(element, track));",
    "        }",
    "      }",
    "    }",
    "",
    "    return () => {",
    "      for (const stop of stops) {",
    "        stop();",
    "      }",
    "    };",
    "  }, []);",
    "",
    "  return null;",
    "}",
    "",
  ].join("\n");
};

export { toReactSource };
