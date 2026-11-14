interface ResizeStep {
  readonly dh: number;
  readonly dw: number;
}

interface ResizeKeyInput {
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly key: string;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
}

const BIG_STEP = 10;

const ARROW_STEPS = new Map<string, ResizeStep>([
  ["ArrowDown", { dh: 1, dw: 0 }],
  ["ArrowLeft", { dh: 0, dw: -1 }],
  ["ArrowRight", { dh: 0, dw: 1 }],
  ["ArrowUp", { dh: -1, dw: 0 }],
]);

const MOD_PREFIX = "Mod+";
const BIG_PREFIX = "Mod+Shift+";

const toResizeChord = (event: ResizeKeyInput): string | null => {
  const isMod = event.metaKey || event.ctrlKey;

  if (!isMod || event.altKey || !ARROW_STEPS.has(event.key)) {
    return null;
  }

  if (event.shiftKey) {
    return `${BIG_PREFIX}${event.key}`;
  }

  return `${MOD_PREFIX}${event.key}`;
};

const toResizeStep = (chord: string | null): ResizeStep | null => {
  if (chord === null) {
    return null;
  }

  if (chord.startsWith(BIG_PREFIX)) {
    const step = ARROW_STEPS.get(chord.slice(BIG_PREFIX.length)) ?? null;

    if (step === null) {
      return null;
    }

    return { dh: step.dh * BIG_STEP, dw: step.dw * BIG_STEP };
  }

  if (!chord.startsWith(MOD_PREFIX)) {
    return null;
  }

  return ARROW_STEPS.get(chord.slice(MOD_PREFIX.length)) ?? null;
};

const isBigResizeStep = (step: ResizeStep): boolean =>
  Math.abs(step.dw) + Math.abs(step.dh) > 1;

const isPlainModKey = (event: ResizeKeyInput): boolean =>
  (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey;

const isSelectSiblingsKey = (event: ResizeKeyInput): boolean =>
  isPlainModKey(event) && event.key.toLowerCase() === "a";

export { isBigResizeStep, isSelectSiblingsKey, toResizeChord, toResizeStep };

export type { ResizeKeyInput, ResizeStep };
