const GRID_COLUMNS = 8;

const STEP = {
  ArrowDown: GRID_COLUMNS,
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -GRID_COLUMNS,
} satisfies Readonly<Record<string, number>>;

const isStepKey = (key: string): key is keyof typeof STEP =>
  Object.hasOwn(STEP, key);

const nextIndex = (
  key: string,
  index: number,
  count: number
): number | null => {
  if (!isStepKey(key) || count === 0) {
    return null;
  }

  return Math.min(count - 1, Math.max(0, index + STEP[key]));
};

export { GRID_COLUMNS, nextIndex };
