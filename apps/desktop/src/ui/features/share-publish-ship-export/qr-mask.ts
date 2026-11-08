import { drawFormat } from "./qr-grid.js";
import type { QrGrid } from "./qr-grid.js";

type MaskRule = (column: number, row: number) => boolean;

const MOD_THREE = 3;
const RUN_MIN = 5;
const BLOCK_PENALTY = 3;
const BALANCE_STEP = 5;
const BALANCE_WEIGHT = 10;
const PERCENT = 100;
const HALF = 50;

const MASK_RULES: readonly MaskRule[] = [
  (column, row) => (column + row) % 2 === 0,
  (_column, row) => row % 2 === 0,
  (column) => column % MOD_THREE === 0,
  (column, row) => (column + row) % MOD_THREE === 0,
  (column, row) =>
    (Math.floor(column / MOD_THREE) + Math.floor(row / 2)) % 2 === 0,
  (column, row) => ((column * row) % 2) + ((column * row) % MOD_THREE) === 0,
  (column, row) =>
    (((column * row) % 2) + ((column * row) % MOD_THREE)) % 2 === 0,
  (column, row) =>
    (((column + row) % 2) + ((column * row) % MOD_THREE)) % 2 === 0,
];

const toMasked = (grid: QrGrid, mask: number): QrGrid => {
  const rule = MASK_RULES[mask];

  const dark = grid.dark.map((line, row) =>
    line.map((isDark, column) => {
      if (grid.fixed[row]?.[column] === true || !rule) {
        return isDark;
      }

      return isDark !== rule(column, row);
    })
  );

  const masked: QrGrid = {
    dark,
    fixed: grid.fixed.map((line) => [...line]),
    size: grid.size,
  };

  drawFormat(masked, mask);

  return masked;
};

const toRunScore = (run: number): number => {
  if (run >= RUN_MIN) {
    return run - 2;
  }

  return 0;
};

const toRunPenalty = (line: readonly boolean[]): number => {
  let penalty = 0;
  let start = 0;

  for (let index = 1; index <= line.length; index += 1) {
    if (index === line.length || line[index] !== line[start]) {
      penalty += toRunScore(index - start);
      start = index;
    }
  }

  return penalty;
};

const toBlockPenalty = (dark: readonly (readonly boolean[])[]): number => {
  let penalty = 0;

  for (let row = 0; row < dark.length - 1; row += 1) {
    for (let column = 0; column < dark.length - 1; column += 1) {
      const value = dark[row]?.[column];

      const isBlock =
        value === dark[row]?.[column + 1] &&
        value === dark[row + 1]?.[column] &&
        value === dark[row + 1]?.[column + 1];

      if (isBlock) {
        penalty += BLOCK_PENALTY;
      }
    }
  }

  return penalty;
};

const toBalancePenalty = (dark: readonly (readonly boolean[])[]): number => {
  const total = dark.length * dark.length;
  const count = dark.flat().filter(Boolean).length;
  const deviation = Math.abs((count * PERCENT) / total - HALF);

  return Math.floor(deviation / BALANCE_STEP) * BALANCE_WEIGHT;
};

const toPenalty = (dark: readonly (readonly boolean[])[]): number => {
  const columns = dark.map((_line, column) =>
    dark.map((line) => line[column] ?? false)
  );

  let runs = 0;

  for (const line of [...dark, ...columns]) {
    runs += toRunPenalty(line);
  }

  return runs + toBlockPenalty(dark) + toBalancePenalty(dark);
};

const toBestMasked = (grid: QrGrid): QrGrid => {
  const scored = MASK_RULES.map((_rule, mask) => {
    const candidate = toMasked(grid, mask);

    return { candidate, penalty: toPenalty(candidate.dark) };
  });

  let [best] = scored;

  for (const item of scored) {
    if (best && item.penalty < best.penalty) {
      best = item;
    }
  }

  return best?.candidate ?? grid;
};

export { toBestMasked };
