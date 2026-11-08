import { toContrastRatio } from "./to-contrast-ratio.js";
import { toAreaRatio, toFigureRatio } from "./to-priors.js";
import type {
  AttentionBox,
  AttentionElement,
  AttentionNoteDraft,
  RankedElement,
} from "./types.js";

interface NoteContext {
  readonly elements: readonly AttentionElement[];
  readonly image: { readonly height: number; readonly width: number };
  readonly ranked: readonly RankedElement[];
}

const TOP_COUNT = 3;

const COMPETING_RATIO = 0.75;

const COMPETING_MIN_SHARE = 0.1;

const TEXT_CONTRAST_MIN = 4.5;

const FIGURE_CONTRAST_MIN = 3;

const WALL_CHARS = 280;

const WALL_AREA = 0.06;

const PERCENT = 100;

const LABEL_CHARS = 40;

const toName = (element: AttentionElement): string => {
  const label = element.label.slice(0, LABEL_CHARS);

  if (label === "") {
    return element.selector;
  }

  return `"${label}"`;
};

const toPercent = (share: number): number => Math.round(share * PERCENT);

const ACTION_VERBS =
  /^(?<verb>upload|save|submit|create|add|continue|send|confirm|next|publish|start|sign|log|get|book|buy|apply|done|finish|run|new|invite|share)\b/iu;

const toPrimaryScore = (element: AttentionElement): number => {
  const area = element.box.width * element.box.height;

  if (ACTION_VERBS.test(element.label.trim())) {
    return area + Number.MAX_SAFE_INTEGER / 2;
  }

  return area;
};

const toPrimary = (
  elements: readonly AttentionElement[]
): AttentionElement | null => {
  const candidates = elements.filter((element) => element.isPrimaryCandidate);
  let best: AttentionElement | null = null;

  for (const element of candidates) {
    if (best === null || toPrimaryScore(element) >= toPrimaryScore(best)) {
      best = element;
    }
  }

  return best;
};

const toContains = (outer: AttentionBox, inner: AttentionBox): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

const toPrimaryNotes = (context: NoteContext): AttentionNoteDraft[] => {
  const primary = toPrimary(context.elements);

  if (primary === null) {
    return [];
  }

  const notes: AttentionNoteDraft[] = [];

  const found = context.ranked.find((item) => item.element === primary);
  const rank = found?.rank ?? context.ranked.length + 1;

  if (rank > TOP_COUNT) {
    notes.push({
      kind: "primary-not-in-top-3",
      layerId: primary.layerId,
      message: `The main action ${toName(primary)} is rank ${rank} for attention, with ${toPercent(found?.share ?? 0)} percent. Give it a stronger fill, a larger size or more space so it is one of the first 3 places the eye goes.`,
    });
  }

  const backdrop = primary.background ?? primary.backdrop;

  const isTextWeak =
    primary.color !== null &&
    backdrop !== null &&
    toContrastRatio(primary.color, backdrop) < TEXT_CONTRAST_MIN;

  if (isTextWeak || toFigureRatio(primary) < FIGURE_CONTRAST_MIN) {
    notes.push({
      kind: "low-contrast-primary",
      layerId: primary.layerId,
      message: `The main action ${toName(primary)} has low contrast. Raise the contrast of its text or fill against the area behind it.`,
    });
  }

  return notes;
};

const toCompetingNotes = (context: NoteContext): AttentionNoteDraft[] => {
  const [first, second] = context.ranked;

  if (!first || !second) {
    return [];
  }

  const isNested =
    toContains(first.element.box, second.element.box) ||
    toContains(second.element.box, first.element.box);

  if (
    isNested ||
    second.share < COMPETING_MIN_SHARE ||
    second.share < first.share * COMPETING_RATIO
  ) {
    return [];
  }

  return [
    {
      kind: "competing-focal-points",
      layerId: second.element.layerId,
      message: `${toName(first.element)} (${toPercent(first.share)} percent) and ${toName(second.element)} (${toPercent(second.share)} percent) compete for the first look. Make one of them clearly stronger.`,
    },
  ];
};

const toWallNotes = (context: NoteContext): AttentionNoteDraft[] => {
  const wall = context.elements.find(
    (element) =>
      element.textLength >= WALL_CHARS &&
      toAreaRatio(element.box, context.image.width, context.image.height) >=
        WALL_AREA
  );

  if (!wall) {
    return [];
  }

  return [
    {
      kind: "text-wall",
      layerId: wall.layerId,
      message: `${toName(wall)} holds ${wall.textLength} characters in one block. Split it into short parts with a heading.`,
    },
  ];
};

const toNotes = (context: NoteContext): AttentionNoteDraft[] => [
  ...toPrimaryNotes(context),
  ...toCompetingNotes(context),
  ...toWallNotes(context),
];

export { toNotes };
