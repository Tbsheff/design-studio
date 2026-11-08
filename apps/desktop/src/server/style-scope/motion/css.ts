import { MOTION_STAGGER_CHILDREN } from "./deps.js";
import type {
  EntrancePreset,
  MotionEntrance,
  MotionKind,
  MotionState,
  MotionTransition,
} from "./deps.js";

interface SheetEdit {
  add: readonly string[];
  kind: MotionKind;
  marker: string | null;
}

const KEYFRAMES: Record<EntrancePreset, string> = {
  "blur-in": "from{opacity:0;filter:blur(8px)}to{opacity:1;filter:none}",
  fade: "from{opacity:0}to{opacity:1}",
  "scale-in":
    "from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:none}",
  "slide-down":
    "from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:none}",
  "slide-up":
    "from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}",
};

const STYLE_ATTR = "style data-studio-motion";

const OPEN_TAG = ["<", STYLE_ATTR, ">"].join("");

const CLOSE_TAG = "</style>";

const HEAD_END = "</head>";

const BLOCK = /<style data-studio-motion>(?<body>[\s\S]*?)<\/style>/u;

const SAFE = "@media (prefers-reduced-motion: no-preference)";

const REDUCE = "@media (prefers-reduced-motion: reduce)";

const MARKER_ID = /studio-mo-[a-z0-9]{8}/u;

const ENTRANCE_EASE = "cubic-bezier(0.16,1,0.3,1)";

const toKeyframeName = (preset: EntrancePreset): string =>
  `studio-motion-${preset}`;

const toKeyframeLine = (preset: EntrancePreset): string =>
  `@keyframes ${toKeyframeName(preset)}{${KEYFRAMES[preset]}}`;

const toAnimationValue = (entrance: MotionEntrance, delayMs: number): string =>
  `${toKeyframeName(entrance.preset)} ${entrance.durationMs}ms ${ENTRANCE_EASE} ${delayMs}ms both`;

const toStaggerLines = (marker: string, entrance: MotionEntrance): string[] => {
  const lines = [
    `${SAFE}{.${marker}>*{animation:${toAnimationValue(entrance, entrance.delayMs)}}}`,
  ];

  for (let index = 2; index <= MOTION_STAGGER_CHILDREN; index += 1) {
    const delay = entrance.delayMs + entrance.staggerMs * (index - 1);

    lines.push(
      `${SAFE}{.${marker}>*:nth-child(${index}){animation-delay:${delay}ms}}`
    );
  }

  return lines;
};

const toEntranceLines = (
  marker: string,
  entrance: MotionEntrance
): string[] => {
  if (entrance.staggerMs > 0) {
    return toStaggerLines(marker, entrance);
  }

  return [
    `${SAFE}{.${marker}{animation:${toAnimationValue(entrance, entrance.delayMs)}}}`,
  ];
};

const toTransitionValue = (transition: MotionTransition): string =>
  transition.properties
    .map(
      (prop) =>
        `${prop} ${transition.durationMs}ms ${transition.easing} ${transition.delayMs}ms`
    )
    .join(",");

const toPseudoOf = (state: MotionState): string => {
  if (state === "focus") {
    return "focus-visible";
  }

  return state;
};

const toEndLine = (marker: string, transition: MotionTransition): string[] => {
  const pairs = Object.entries(transition.end);

  if (!transition.state || pairs.length === 0) {
    return [];
  }

  const body = pairs.map(([prop, value]) => `${prop}:${value}`).join(";");

  return [`.${marker}:${toPseudoOf(transition.state)}{${body}}`];
};

const toTransitionLines = (
  marker: string,
  transition: MotionTransition
): string[] => [
  `.${marker}{transition:${toTransitionValue(transition)}}`,
  ...toEndLine(marker, transition),
  `${REDUCE}{.${marker}{transition:none}}`,
];

const isAnimationLine = (line: string): boolean => line.includes("animation");

const toDropLine = (line: string, edit: SheetEdit): boolean => {
  if (edit.marker === null || !line.includes(`.${edit.marker}`)) {
    return false;
  }

  if (edit.kind === "none") {
    return true;
  }

  return isAnimationLine(line) === (edit.kind === "entrance");
};

const toMergeLines = (lines: readonly string[], edit: SheetEdit): string[] => {
  const kept = lines.filter((line) => !toDropLine(line.trim(), edit));
  const seen = new Set(kept);

  for (const line of edit.add) {
    if (!(line.startsWith("@keyframes") && seen.has(line))) {
      kept.push(line);
      seen.add(line);
    }
  }

  return kept;
};

const toBlockOf = (lines: readonly string[]): string =>
  [OPEN_TAG, ...lines, CLOSE_TAG].join("\n");

const insertMotionRule = (code: string, lines: readonly string[]): string => {
  const head = code.indexOf(HEAD_END);

  if (head === -1) {
    return [toBlockOf(lines), code].join("\n");
  }

  return [code.slice(0, head), toBlockOf(lines), "\n", code.slice(head)].join(
    ""
  );
};

const toUpsertHtmlBlock = (code: string, edit: SheetEdit): string => {
  const match = BLOCK.exec(code);

  if (!match) {
    if (edit.add.length === 0) {
      return code;
    }

    return insertMotionRule(code, edit.add);
  }

  const lines = (match.groups?.["body"] ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

  return code.replace(BLOCK, toBlockOf(toMergeLines(lines, edit)));
};

const toUpsertCss = (text: string, edit: SheetEdit): string =>
  toMergeLines(text.split("\n"), edit).join("\n");

const toMarkerRules = (text: string, marker: string | null): string[] => {
  if (!marker) {
    return [];
  }

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes(`.${marker}`));
};

const toFindMarker = (text: string): string | null =>
  MARKER_ID.exec(text)?.[0] ?? null;

export {
  toAnimationValue as animationValue,
  toEntranceLines as entranceLines,
  toFindMarker as findMarker,
  toKeyframeLine as keyframeLine,
  toKeyframeName as keyframeName,
  toMarkerRules as markerRules,
  toTransitionLines as transitionLines,
  toUpsertCss as upsertCss,
  toUpsertHtmlBlock as upsertHtmlBlock,
};

export type { SheetEdit };
