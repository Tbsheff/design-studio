type SweepKind = "color" | "font" | "radius" | "spacing";

interface Rgb {
  readonly blue: number;
  readonly green: number;
  readonly red: number;
}

interface SweepToken {
  readonly cssVar: string;
  readonly kind: SweepKind;
  readonly px: number | null;
  readonly rgb: Rgb | null;
  readonly suffix: string | null;
}

type CandidateForm = "class" | "css";

interface Candidate {
  readonly end: number;
  readonly form: CandidateForm;
  readonly kind: SweepKind;
  readonly line: number;
  readonly negative: boolean;
  readonly prefix: string;
  readonly raw: string;
  readonly start: number;
  readonly value: string;
}

interface Region {
  readonly end: number;
  readonly start: number;
}

interface SweepChange {
  readonly after: string;
  readonly before: string;
  readonly distance: number;
  readonly exact: boolean;
  readonly file: string;
  readonly id: string;
  readonly kind: SweepKind;
  readonly line: number;
  readonly token: string;
}

interface SweepLeftover {
  readonly file: string;
  readonly kind: SweepKind;
  readonly line: number;
  readonly nearest: string | null;
  readonly value: string;
}

interface SweepPlan {
  readonly changes: readonly SweepChange[];
  readonly code: string;
  readonly unmatched: readonly SweepLeftover[];
}

export type {
  Candidate,
  CandidateForm,
  Region,
  Rgb,
  SweepChange,
  SweepKind,
  SweepLeftover,
  SweepPlan,
  SweepToken,
};
