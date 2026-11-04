import { findCandidates } from "./find.js";
import { DEFAULT_LIMITS, matchCandidate } from "./match.js";
import type { Limits } from "./match.js";
import type {
  Candidate,
  Region,
  SweepChange,
  SweepKind,
  SweepLeftover,
  SweepPlan,
  SweepToken,
} from "./types.js";

interface SweepInput {
  readonly code: string;
  readonly file: string;
  readonly isCss: boolean;
  readonly kinds: ReadonlySet<SweepKind>;
  readonly limits?: Limits;
  readonly region: Region | null;
  readonly select: ReadonlySet<string> | null;
  readonly tokens: readonly SweepToken[];
}

interface Edit {
  readonly end: number;
  readonly start: number;
  readonly text: string;
}

const ROUND = 100;

const idOf = (file: string, start: number): string => `${file}:${start}`;

const isSelected = (select: ReadonlySet<string> | null, id: string): boolean =>
  select === null || select.has(id);

const roundOf = (value: number): number => Math.round(value * ROUND) / ROUND;

const applyEdits = (code: string, edits: readonly Edit[]): string => {
  let next = code;

  for (const edit of edits.toSorted(
    (left, right) => right.start - left.start
  )) {
    next = `${next.slice(0, edit.start)}${edit.text}${next.slice(edit.end)}`;
  }

  return next;
};

const changeOf = (
  input: SweepInput,
  candidate: Candidate,
  match: {
    distance: number;
    exact: boolean;
    replacement: string;
    token: string;
  }
): SweepChange => ({
  after: match.replacement,
  before: candidate.raw,
  distance: roundOf(match.distance),
  exact: match.exact,
  file: input.file,
  id: idOf(input.file, candidate.start),
  kind: candidate.kind,
  line: candidate.line,
  token: match.token,
});

const planSweep = (input: SweepInput): SweepPlan => {
  const candidates = findCandidates(input.code, {
    isCss: input.isCss,
    kinds: input.kinds,
    region: input.region,
  });

  const changes: SweepChange[] = [];
  const unmatched: SweepLeftover[] = [];
  const edits: Edit[] = [];

  for (const candidate of candidates) {
    const outcome = matchCandidate(
      candidate,
      input.tokens,
      input.limits ?? DEFAULT_LIMITS
    );

    if ("leftover" in outcome) {
      unmatched.push({
        file: input.file,
        kind: candidate.kind,
        line: candidate.line,
        nearest: outcome.leftover.nearest,
        value: candidate.raw,
      });
    }

    if (
      "match" in outcome &&
      isSelected(input.select, idOf(input.file, candidate.start))
    ) {
      edits.push({
        end: candidate.end,
        start: candidate.start,
        text: outcome.match.replacement,
      });
      changes.push(changeOf(input, candidate, outcome.match));
    }
  }

  const code = applyEdits(input.code, edits);

  return { changes, code, unmatched };
};

export { idOf, planSweep };

export type { SweepInput };
