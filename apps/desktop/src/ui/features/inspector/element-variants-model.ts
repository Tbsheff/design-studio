interface CountTip {
  readonly isOver: boolean;
  readonly max: number;
}

const DEFAULT_VARIANT_COUNT = 3;

const VARIANT_COUNTS: readonly number[] = [
  DEFAULT_VARIANT_COUNT - 1,
  DEFAULT_VARIANT_COUNT,
  DEFAULT_VARIANT_COUNT + 1,
];

const NOTE_MAX_LENGTH = 2000;

const NOTE_ROWS = 2;

const CLOSE_ICON_SIZE = 14;

const toDefaultCount = (max: number): number =>
  Math.min(DEFAULT_VARIANT_COUNT, max);

const toCountTip = ({ isOver, max }: CountTip): string | null => {
  if (isOver) {
    return `React projects run at most ${max} at a time`;
  }

  return null;
};

const toCountClass = (isSelected: boolean): string => {
  if (isSelected) {
    return "btn small primary";
  }

  return "btn small";
};

export {
  CLOSE_ICON_SIZE,
  NOTE_MAX_LENGTH,
  NOTE_ROWS,
  VARIANT_COUNTS,
  toCountClass,
  toCountTip,
  toDefaultCount,
};
