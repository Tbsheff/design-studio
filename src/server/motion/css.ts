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

const keyframeName = (preset: EntrancePreset): string =>
  `studio-motion-${preset}`;

const keyframeLine = (preset: EntrancePreset): string =>
  `@keyframes ${keyframeName(preset)}{${KEYFRAMES[preset]}}`;

const animationValue = (entrance: MotionEntrance, delayMs: number): string =>
  `${keyframeName(entrance.preset)} ${entrance.durationMs}ms ${ENTRANCE_EASE} ${delayMs}ms both`;

const staggerLines = (marker: string, entrance: MotionEntrance): string[] => {
  const lines = [
    `${SAFE}{.${marker}>*{animation:${animationValue(entrance, entrance.delayMs)}}}`,
  ];

  for (let index = 2; index <= MOTION_STAGGER_CHILDREN; index += 1) {
    const delay = entrance.delayMs + entrance.staggerMs * (index - 1);

    lines.push(
      `${SAFE}{.${marker}>*:nth-child(${index}){animation-delay:${delay}ms}}`
    );
  }

  return lines;
};

const entranceLines = (marker: string, entrance: MotionEntrance): string[] => {
  if (entrance.staggerMs > 0) {
    return staggerLines(marker, entrance);
  }

  return [
    `${SAFE}{.${marker}{animation:${animationValue(entrance, entrance.delayMs)}}}`,
  ];
};

const transitionValue = (transition: MotionTransition): string =>
  transition.properties
    .map(
      (prop) =>
        `${prop} ${transition.durationMs}ms ${transition.easing} ${transition.delayMs}ms`
    )
    .join(",");

const pseudoOf = (state: MotionState): string => {
  if (state === "focus") {
    return "focus-visible";
  }

  return state;
};

const endLine = (marker: string, transition: MotionTransition): string[] => {
  const pairs = Object.entries(transition.end);

  if (!transition.state || pairs.length === 0) {
    return [];
  }

  const body = pairs.map(([prop, value]) => `${prop}:${value}`).join(";");

  return [`.${marker}:${pseudoOf(transition.state)}{${body}}`];
};

const transitionLines = (
  marker: string,
  transition: MotionTransition
): string[] => [
  `.${marker}{transition:${transitionValue(transition)}}`,
  ...endLine(marker, transition),
  `${REDUCE}{.${marker}{transition:none}}`,
];

const isAnimationLine = (line: string): boolean => line.includes("animation");

const dropLine = (line: string, edit: SheetEdit): boolean => {
  if (edit.marker === null || !line.includes(`.${edit.marker}`)) {
    return false;
  }

  if (edit.kind === "none") {
    return true;
  }

  return isAnimationLine(line) === (edit.kind === "entrance");
};

const mergeLines = (lines: readonly string[], edit: SheetEdit): string[] => {
  const kept = lines.filter((line) => !dropLine(line.trim(), edit));
  const seen = new Set(kept);

  for (const line of edit.add) {
    if (!(line.startsWith("@keyframes") && seen.has(line))) {
      kept.push(line);
      seen.add(line);
    }
  }

  return kept;
};

const blockOf = (lines: readonly string[]): string =>
  [OPEN_TAG, ...lines, CLOSE_TAG].join("\n");

const insertBlock = (code: string, lines: readonly string[]): string => {
  const head = code.indexOf(HEAD_END);

  if (head === -1) {
    return [blockOf(lines), code].join("\n");
  }

  return [code.slice(0, head), blockOf(lines), "\n", code.slice(head)].join("");
};

const upsertHtmlBlock = (code: string, edit: SheetEdit): string => {
  const match = BLOCK.exec(code);

  if (!match) {
    if (edit.add.length === 0) {
      return code;
    }

    return insertBlock(code, edit.add);
  }

  const lines = (match.groups?.["body"] ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

  return code.replace(BLOCK, blockOf(mergeLines(lines, edit)));
};

const upsertCss = (text: string, edit: SheetEdit): string =>
  mergeLines(text.split("\n"), edit).join("\n");

const markerRules = (text: string, marker: string | null): string[] => {
  if (!marker) {
    return [];
  }

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes(`.${marker}`));
};

const findMarker = (text: string): string | null =>
  MARKER_ID.exec(text)?.[0] ?? null;

export {
  animationValue,
  entranceLines,
  findMarker,
  keyframeLine,
  keyframeName,
  markerRules,
  transitionLines,
  upsertCss,
  upsertHtmlBlock,
};

export type { SheetEdit };
