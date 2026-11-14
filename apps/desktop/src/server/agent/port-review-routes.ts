import type { PortReviewRecord } from "@design-studio/contracts/port";

import { REFERENCE_LOW_SCORE } from "../../shared/reference.js";
import { toDarkText, toGapCount } from "./port-review-dark.js";
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

const KIT_DROP_MAX = 2;

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

type LoopStop = "flat" | "loops" | "quit" | "time";

interface RoutesState {
  readonly best: readonly RouteCheck[];
  readonly first: readonly RouteCheck[];
  readonly isUndone: boolean;
  readonly loops: number;
  readonly passes: readonly RoutePassNote[];
  readonly stop: LoopStop | null;
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
  readonly stop: LoopStop | null;
}

interface RoutesSnapshotted {
  readonly next: readonly RouteCheck[] | null;
  readonly snapshot: RouteSnapshot | null;
}

const LOOPS_MAX = 2;

const SECOND_LOOP_MS = 60_000;

const IMAGES_MAX = 4;

const ROUTES_AT_ONCE = 3;

const STOP_TEXTS: Readonly<Record<LoopStop, string>> = {
  flat: "stopped because the fix loop did not raise the scores",
  loops: `stopped after ${LOOPS_MAX} fix loops`,
  quit: "stopped because the fix prompt did not run",
  time: "stopped at the time limit",
};

const listLimited = async <Item, Value>(
  items: readonly Item[],
  limit: number,
  task: (item: Item) => Promise<Value>
): Promise<Value[]> => {
  const queue = [...items.entries()];
  const values = new Map<number, Value>();

  const runLane = async (): Promise<void> => {
    const entry = queue.shift() ?? null;

    if (entry === null) {
      return;
    }

    const [at, item] = entry;
    values.set(at, await task(item));
    await runLane();
  };

  const lanes = Array.from({ length: Math.min(limit, items.length) }, () =>
    runLane()
  );

  await Promise.all(lanes);

  return items.flatMap((_item, at) => {
    const value = values.get(at) ?? null;

    if (value === null) {
      return [];
    }

    return [value];
  });
};

const toRouteInput = (
  input: PortReviewInput,
  route: PortRouteGaps
): PortReviewInput => ({
  ...input,
  gaps: { ...input.gaps, ...route, routes: [route] },
});

const toRouteCheck = async (
  input: PortReviewInput,
  steps: RouteSteps
): Promise<RouteCheck> => ({ check: await steps.inspectRoute(input), input });

const toCheckedAgain = (
  item: RouteCheck,
  steps: RouteSteps
): Promise<RouteCheck> => {
  if (item.check.match.score !== null) {
    return Promise.resolve(item);
  }

  return toRouteCheck(item.input, steps);
};

const listRouteChecks = async (
  inputs: readonly PortReviewInput[],
  steps: RouteSteps
): Promise<RouteCheck[]> => {
  const checks = await listLimited(inputs, ROUTES_AT_ONCE, (input) =>
    toRouteCheck(input, steps)
  );

  return listLimited(checks, 1, (item) => toCheckedAgain(item, steps));
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

  const kitWas = before.reduce(
    (sum, route) => sum + toGapCount(route.check),
    0
  );

  const kitNow = after.reduce((sum, route) => sum + toGapCount(route.check), 0);

  const isKitTrade = kitNow < kitWas && was - now <= KIT_DROP_MAX;

  return now < was && !isKitTrade;
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

const toLoopStop = (step: RoutesStep): LoopStop | null => {
  if (step.ran >= LOOPS_MAX) {
    return "loops";
  }

  if (step.ran > 0 && Date.now() - step.startedAt > SECOND_LOOP_MS) {
    return "time";
  }

  return null;
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
  const stop = toLoopStop(step);

  const done: RoutesLoop = {
    best: step.best,
    isUndone: false,
    loops: step.ran,
    stop,
  };

  if (!isAnyFixNeeded(step.best) || stop !== null) {
    return done;
  }

  const { next, snapshot } = await runWithRouteSnapshot(input, steps, step);

  if (next === null) {
    return { ...done, stop: "quit" };
  }

  if (isLowerSet(step.best, next) && snapshot !== null) {
    await restoreRouteSnapshot(snapshot);

    return { ...done, isUndone: true, loops: step.ran + 1 };
  }

  if (step.ran === 0 && !isRaisedSet(step.best, next)) {
    return { best: next, isUndone: false, loops: 1, stop: "flat" };
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

const listRoutePasses = (
  checks: readonly RouteCheck[],
  steps: RouteSteps
): Promise<RoutePassed[]> =>
  listLimited(checks, 1, async (item) => ({
    item,
    pass: await toRoutePass(item, steps),
  }));

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

  return `${text}, ${toDarkText(item.check.dark)}`;
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

  if (state.stop !== null && isAnyFixNeeded(state.best)) {
    parts.push(STOP_TEXTS[state.stop]);
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
      stop: null,
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
