type TypeSeverity = "high" | "low" | "medium";

interface TypeText {
  readonly chars: number;
  readonly family: string;
  readonly isBlock: boolean;
  readonly isHeading: boolean;
  readonly isLabel: boolean;
  readonly level: number;
  readonly lineHeight: number;
  readonly lines: number;
  readonly selector: string;
  readonly size: number;
  readonly tag: string;
  readonly text: string;
}

interface TypeSpace {
  readonly prop: string;
  readonly px: number;
}

interface TypeBox {
  readonly selector: string;
  readonly spaces: readonly TypeSpace[];
}

interface TypeProbeResult {
  readonly boxes: readonly TypeBox[];
  readonly isTailwind: boolean;
  readonly texts: readonly TypeText[];
}

interface TypeStep {
  readonly cssVar: string;
  readonly px: number;
}

interface TypeFix {
  readonly label: string;
  readonly style: Readonly<Record<string, string>>;
  readonly tailwindClass: string | null;
}

interface TypeHit {
  readonly fix: TypeFix | null;
  readonly hint: string;
  readonly message: string;
  readonly selector: string;
  readonly severity: TypeSeverity;
}

const SEVERITY_RANK: Readonly<Record<TypeSeverity, number>> = {
  high: 0,
  low: 2,
  medium: 1,
};

const HALF_STEPS = 2;

const NAME_CHARS = 30;

const toRounded = (value: number): number =>
  Math.round(value * HALF_STEPS) / HALF_STEPS;

const toPx = (value: number): string => `${value} px`;

const toCounts = <Key>(values: readonly Key[]): Map<Key, number> => {
  const out = new Map<Key, number>();

  for (const value of values) {
    out.set(value, (out.get(value) ?? 0) + 1);
  }

  return out;
};

const toMode = (values: readonly number[]): number | null => {
  let best: number | null = null;
  let most = 0;

  for (const [value, count] of toCounts(values)) {
    if (count > most) {
      best = value;
      most = count;
    }
  }

  return best;
};

const toNearest = (
  target: number,
  options: readonly number[]
): number | null => {
  let best: number | null = null;

  for (const option of options) {
    if (best === null || Math.abs(option - target) < Math.abs(best - target)) {
      best = option;
    }
  }

  return best;
};

const toNearestStep = (
  target: number,
  steps: readonly TypeStep[]
): TypeStep | null => {
  let best: TypeStep | null = null;

  for (const step of steps) {
    if (
      best === null ||
      Math.abs(step.px - target) < Math.abs(best.px - target)
    ) {
      best = step;
    }
  }

  return best;
};

const toStyleFix = (
  label: string,
  style: Readonly<Record<string, string>>
): TypeFix => ({ label, style, tailwindClass: null });

const toEachHit = (
  texts: readonly TypeText[],
  isHit: (text: TypeText) => boolean,
  toHit: (text: TypeText) => TypeHit
): TypeHit[] =>
  texts.flatMap((text) => {
    if (!isHit(text)) {
      return [];
    }

    return [toHit(text)];
  });

const toName = (text: TypeText): string =>
  `${text.tag} "${text.text.slice(0, NAME_CHARS)}"`;

export {
  SEVERITY_RANK,
  toCounts,
  toEachHit,
  toMode,
  toName,
  toNearest,
  toNearestStep,
  toPx,
  toRounded,
  toStyleFix,
};

export type {
  TypeBox,
  TypeFix,
  TypeHit,
  TypeProbeResult,
  TypeSeverity,
  TypeSpace,
  TypeStep,
  TypeText,
};
