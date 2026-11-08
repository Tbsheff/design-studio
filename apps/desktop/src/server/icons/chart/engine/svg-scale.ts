interface ValueScale {
  readonly max: number;
  readonly min: number;
  readonly step: number;
  readonly ticks: readonly number[];
}

const TICK_TARGET = 4;

const STEP_ONE = 1;

const STEP_TWO = 2;

const STEP_HALF = 2.5;

const STEP_FIVE = 5;

const STEP_TEN = 10;

const STEPS = [STEP_ONE, STEP_TWO, STEP_HALF, STEP_FIVE, STEP_TEN] as const;

const LABEL_FACTOR = 100;

const toStep = (span: number): number => {
  const raw = span / TICK_TARGET;
  const magnitude = STEP_TEN ** Math.floor(Math.log10(raw));
  const normal = raw / magnitude;
  const found = STEPS.find((candidate) => normal <= candidate) ?? STEP_TEN;

  return found * magnitude;
};

const toValueScale = (low: number, high: number): ValueScale => {
  const min = Math.min(0, low);
  const max = Math.max(0, high);
  const gap = toStep(Math.max(max - min, 1));
  const first = Math.floor(min / gap);
  const count = Math.max(Math.ceil(max / gap) - first, 1);

  return {
    max: (first + count) * gap,
    min: first * gap,
    step: gap,
    ticks: Array.from(
      { length: count + 1 },
      (_unused, index) => (first + index) * gap
    ),
  };
};

const toTickLabel = (value: number): string =>
  `${Math.round(value * LABEL_FACTOR) / LABEL_FACTOR}`;

export { toTickLabel, toValueScale };

export type { ValueScale };
