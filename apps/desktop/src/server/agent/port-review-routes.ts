import type { PortReviewRecord } from "@design-studio/contracts/port";

import { REFERENCE_LOW_SCORE } from "../../shared/reference.js";
import {
  createRouteSnapshot,
  restoreRouteSnapshot,
} from "./port-review-snapshot.js";
import type { RouteSnapshot } from "./port-review-snapshot.js";
import {
  isFixNeeded,
  toContinueText,
  toFixLines,
  toRecord,
} from "./port-review.js";
import type {
  PortCheck,
  PortReview,
  PortReviewInput,
  PortRouteGaps,
} from "./port-review.js";
import type { ImagePart } from "./user-message.js";

interface RoutePass {
  readonly check: PortCheck;
  readonly count: number;
  readonly isUndone: boolean;
  readonly scoreAfter: number;
  readonly scoreBefore: number;
}

interface RouteSteps {
  readonly inspectRoute: (input: PortReviewInput) => Promise<PortCheck>;
  readonly runValuesFirst: (
    input: PortReviewInput,
    first: PortCheck
  ) => Promise<RoutePass | null>;
}

interface RouteCheck {
  readonly check: PortCheck;
  readonly input: PortReviewInput;
}

interface RoutePassNote {
  readonly pass: RoutePass;
  readonly route: string;
}

interface RoutesState {
  readonly best: readonly RouteCheck[];
  readonly first: readonly RouteCheck[];
  readonly isUndone: boolean;
  readonly loops: number;
  readonly passes: readonly RoutePassNote[];
}

interface RoutesStep {
  readonly best: readonly RouteCheck[];
  readonly ran: number;
  readonly startedAt: number;
}

interface RoutesLoop {
  readonly best: readonly RouteCheck[];
  readonly isUndone: boolean;
  readonly loops: number;
}

interface RoutesSnapshotted {
  readonly next: readonly RouteCheck[] | null;
  readonly snapshot: RouteSnapshot | null;
}

const LOOPS_MAX = 2;

const SECOND_LOOP_MS = 60_000;

const IMAGES_MAX = 4;

const toRouteInput = (
  input: PortReviewInput,
  route: PortRouteGaps
): PortReviewInput => ({
  ...input,
  gaps: { ...input.gaps, ...route, routes: [route] },
});

const listRouteChecks = async (
  inputs: readonly PortReviewInput[],
  steps: RouteSteps
): Promise<RouteCheck[]> => {
  const head = inputs[0] ?? null;

  if (head === null) {
    return [];
  }

  const check = await steps.inspectRoute(head);

  return [
    { check, input: head },
    ...(await listRouteChecks(inputs.slice(1), steps)),
  ];
};

const isAnyFixNeeded = (checks: readonly RouteCheck[]): boolean =>
  checks.some((item) => isFixNeeded(item.check));

const toScoreSum = (
  before: readonly RouteCheck[],
  after: readonly RouteCheck[]
): readonly [number, number] => {
  let left = 0;
  let right = 0;

  for (const [index, item] of before.entries()) {
    const was = item.check.match.score;
    const now = after[index]?.check.match.score ?? null;

    if (was !== null && now !== null) {
      left += was;
      right += now;
    }
  }

  return [left, right];
};

const isLowerSet = (
  before: readonly RouteCheck[],
  after: readonly RouteCheck[]
): boolean => {
  const [was, now] = toScoreSum(before, after);

  return now < was;
};

const isRaisedSet = (
  before: readonly RouteCheck[],
  after: readonly RouteCheck[]
): boolean => {
  const [was, now] = toScoreSum(before, after);

  return now > was;
};

const toLowChecks = (checks: readonly RouteCheck[]): RouteCheck[] =>
  checks.filter((item) => isFixNeeded(item.check));

const toRoutesPrompt = (checks: readonly RouteCheck[]): string => {
  const low = toLowChecks(checks);

  return toContinueText([
    `The studio checked ${checks.length} routes of the flow. ${low.length} of them fail to render or score under ${REFERENCE_LOW_SCORE}. Fix only these routes:`,
    ...low.flatMap((item) => toFixLines(item.input.gaps, item.check)),
  ]);
};

const toRoutesImages = (checks: readonly RouteCheck[]): ImagePart[] =>
  toLowChecks(checks)
    .flatMap((item) => item.check.match.images)
    .slice(0, IMAGES_MAX);

const isLoopOver = (step: RoutesStep): boolean => {
  if (!isAnyFixNeeded(step.best) || step.ran >= LOOPS_MAX) {
    return true;
  }

  return step.ran > 0 && Date.now() - step.startedAt > SECOND_LOOP_MS;
};

const runRoutesLoop = async (
  input: PortReviewInput,
  steps: RouteSteps,
  step: RoutesStep
): Promise<readonly RouteCheck[] | null> => {
  const isRan = await input.continueWith(
    toRoutesPrompt(step.best),
    toRoutesImages(step.best)
  );

  if (!isRan) {
    return null;
  }

  return listRouteChecks(
    step.best.map((item) => item.input),
    steps
  );
};

const runWithRouteSnapshot = async (
  input: PortReviewInput,
  steps: RouteSteps,
  step: RoutesStep
): Promise<RoutesSnapshotted> => {
  const snapshot = await createRouteSnapshot(input.gaps.workTree);

  return { next: await runRoutesLoop(input, steps, step), snapshot };
};

const runRoutesLoops = async (
  input: PortReviewInput,
  steps: RouteSteps,
  step: RoutesStep
): Promise<RoutesLoop> => {
  const done: RoutesLoop = {
    best: step.best,
    isUndone: false,
    loops: step.ran,
  };

  if (isLoopOver(step)) {
    return done;
  }

  const { next, snapshot } = await runWithRouteSnapshot(input, steps, step);

  if (next === null) {
    return done;
  }

  if (isLowerSet(step.best, next) && snapshot !== null) {
    await restoreRouteSnapshot(snapshot);

    return { ...done, isUndone: true, loops: step.ran + 1 };
  }

  if (step.ran === 0 && !isRaisedSet(step.best, next)) {
    return { best: next, isUndone: false, loops: 1 };
  }

  return runRoutesLoops(input, steps, {
    best: next,
    ran: step.ran + 1,
    startedAt: step.startedAt,
  });
};

const toRoutePass = (
  item: RouteCheck,
  steps: RouteSteps
): Promise<RoutePass | null> => {
  if (!isFixNeeded(item.check)) {
    return Promise.resolve(null);
  }

  return steps.runValuesFirst(item.input, item.check);
};

interface RoutePassed {
  readonly item: RouteCheck;
  readonly pass: RoutePass | null;
}

const toPassNotes = (passed: readonly RoutePassed[]): RoutePassNote[] =>
  passed.flatMap((entry) => {
    if (entry.pass === null || entry.pass.count === 0) {
      return [];
    }

    return [{ pass: entry.pass, route: entry.item.input.gaps.ref.routePath }];
  });

const listRoutePasses = async (
  checks: readonly RouteCheck[],
  steps: RouteSteps
): Promise<RoutePassed[]> => {
  const item = checks[0] ?? null;

  if (item === null) {
    return [];
  }

  const pass = await toRoutePass(item, steps);

  return [{ item, pass }, ...(await listRoutePasses(checks.slice(1), steps))];
};

const runRoutePasses = async (
  checks: readonly RouteCheck[],
  steps: RouteSteps
): Promise<readonly [RouteCheck[], RoutePassNote[]]> => {
  const passed = await listRoutePasses(checks, steps);

  const after = passed.map((entry) => ({
    check: entry.pass?.check ?? entry.item.check,
    input: entry.item.input,
  }));

  return [after, toPassNotes(passed)];
};

const toRouteScore = (item: RouteCheck): string => {
  const { match, render } = item.check;
  const route = item.input.gaps.ref.routePath;
  let text = `${route} ${match.score ?? "no score"}`;

  const areas = match.areas.map((area) => [area.name, area.score].join(" "));

  if (areas.length > 0) {
    text = `${text} (${areas.join(", ")} under ${REFERENCE_LOW_SCORE})`;
  }

  if (!render.isRendered) {
    return `${text}, fails to render (${render.problem})`;
  }

  return text;
};

const toScoresText = (checks: readonly RouteCheck[]): string =>
  checks.map((item) => toRouteScore(item)).join(", ");

const toPassNote = (note: RoutePassNote): string => {
  const text = `wrote ${note.pass.count} prototype values on ${note.route} (port score ${note.pass.scoreBefore} -> ${note.pass.scoreAfter})`;

  if (note.pass.isUndone) {
    return `${text}, then undid them because they lowered the score`;
  }

  return text;
};

const toLoopsNote = (state: RoutesState): string => {
  const loops = `${state.loops} fix loops ran`;
  let ran = loops;

  if (state.loops === 1) {
    ran = "a fix loop ran";
  }

  if (state.isUndone) {
    return `${ran}; the last lowered the scores, so its edits were undone; kept ${toScoresText(state.best)}`;
  }

  return `${ran}; after it ${toScoresText(state.best)}`;
};

const toRoutesNote = (state: RoutesState): string => {
  const head = `Studio port check of ${state.first.length} routes: ${toScoresText(state.first)}.`;
  const parts = state.passes.map((note) => toPassNote(note));

  if (state.loops > 0) {
    parts.push(toLoopsNote(state));
  }

  if (parts.length === 0) {
    return head;
  }

  return `${head} Studio check: ${parts.join("; ")}.`;
};

const toRoutesRecord = (state: RoutesState): PortReviewRecord => {
  const records = state.best.map((item) =>
    toRecord(item.check, state.loops > 0)
  );

  const scores = records.flatMap((record) => {
    if (record.score === null) {
      return [];
    }

    return [record.score];
  });

  let score: number | null = null;

  if (scores.length > 0) {
    score = Math.min(...scores);
  }

  return {
    fixLoop: state.loops > 0,
    rendered: records.every((record) => record.rendered),
    score,
  };
};

const toRoutesReview = (state: RoutesState): PortReview => ({
  note: toRoutesNote(state),
  record: toRoutesRecord(state),
});

const runRoutesReview = async (
  input: PortReviewInput,
  steps: RouteSteps
): Promise<PortReview> => {
  const inputs = input.gaps.routes.map((route) => toRouteInput(input, route));
  const firstChecks = await listRouteChecks(inputs, steps);

  if (!isAnyFixNeeded(firstChecks)) {
    return toRoutesReview({
      best: firstChecks,
      first: firstChecks,
      isUndone: false,
      loops: 0,
      passes: [],
    });
  }

  const [start, passNotes] = await runRoutePasses(firstChecks, steps);

  const loops = await runRoutesLoops(input, steps, {
    best: start,
    ran: 0,
    startedAt: Date.now(),
  });

  return toRoutesReview({ ...loops, first: firstChecks, passes: passNotes });
};

export { runRoutesReview };

export type { RoutePass, RouteSteps };
