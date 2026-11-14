import { CANVAS_MAX_HEIGHT } from "@design-studio/contracts/canvas-file";

type FitStep =
  | { readonly kind: "done"; readonly height: number }
  | { readonly kind: "check"; readonly height: number };

interface FitResult {
  readonly height: number;
  readonly warning: string | null;
}

interface FitPreset {
  readonly height: number;
  readonly width: number;
}

const SCREEN_WARNING =
  "The page has sections sized to the screen height (100vh), so it grows with the frame. The frame is set to its height at the device size.";

const TALL_WARNING = `The page is taller than ${CANVAS_MAX_HEIGHT} px. The frame stops at ${CANVAS_MAX_HEIGHT} px.`;

const toBaseHeight = (
  width: number,
  presets: readonly FitPreset[],
  fallback: FitPreset
): number =>
  presets.find((preset) => preset.width === width)?.height ?? fallback.height;

const toFirstStep = (base: number, scrollHeight: number): FitStep => {
  const height = Math.min(CANVAS_MAX_HEIGHT, Math.max(base, scrollHeight));

  if (height === base) {
    return { height, kind: "done" };
  }

  return { height, kind: "check" };
};

const toCheckedFit = (height: number, scrollHeight: number): FitResult => {
  if (scrollHeight <= height) {
    return { height, warning: null };
  }

  if (height === CANVAS_MAX_HEIGHT) {
    return { height, warning: TALL_WARNING };
  }

  return { height, warning: SCREEN_WARNING };
};

export { toBaseHeight, toCheckedFit, toFirstStep };

export type { FitPreset, FitResult, FitStep };
