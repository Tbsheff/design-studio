import { PortAppliedSchema } from "@design-studio/actions/port/schema";
import type { PortApplied } from "@design-studio/actions/port/schema";
import { Result, Schema } from "effect";

import { runAgentTool, runConfirmedAgentTool } from "../mcp/index.js";
import { toDecoder } from "../platform/decode/index.js";
import { inspectRouteDark, toGapCount } from "./port-review-dark.js";
import { inspectRouteKit, toKitNote } from "./port-review-kit.js";
import { inspectPortMatch, inspectRouteRender } from "./port-review-read.js";
import type { InspectCall } from "./port-review-read.js";
import { runRoutesReview } from "./port-review-routes.js";
import {
  createRouteSnapshot,
  restoreRouteSnapshot,
} from "./port-review-snapshot.js";
import type { RouteSnapshot } from "./port-review-snapshot.js";
import {
  isFixNeeded,
  toCheckText,
  toFixPrompt,
  toHidText,
  toRecord,
} from "./port-review.js";
import type { PortCheck, PortReview, PortReviewInput } from "./port-review.js";

interface ValuesPass {
  readonly check: PortCheck;
  readonly count: number;
  readonly isUndone: boolean;
  readonly scoreAfter: number;
  readonly scoreBefore: number;
  readonly written: readonly string[];
}

interface LoopRun {
  readonly best: PortCheck;
  readonly isUndone: boolean;
  readonly loops: number;
}

interface ReviewState extends LoopRun {
  readonly first: PortCheck;
  readonly pass: ValuesPass | null;
}

interface LoopStep {
  readonly best: PortCheck;
  readonly ran: number;
  readonly startedAt: number;
}

const APPLY_TOOL = "apply_port";

const LOOPS_MAX = 2;

const SECOND_LOOP_MS = 60_000;

const WRITTEN_SHOWN = 5;

const WAS_MARK = " (was ";

const KIT_DROP_MAX = 2;

const decodeApplied = toDecoder(
  Schema.fromJsonString(PortAppliedSchema),
  "ignore"
);

const inspectRoute = async (input: PortReviewInput): Promise<PortCheck> => {
  const inspect: InspectCall = (name, body) =>
    runAgentTool(input.runtime, name, body);

  const { gaps } = input;

  const [match, render, kit, dark] = await Promise.all([
    inspectPortMatch(inspect, input.gaps.ref),
    inspectRouteRender(input.preview, input.gaps.url, input.gaps.files),
    inspectRouteKit({
      files: input.gaps.files,
      project: input.gaps.project,
      routePath: input.gaps.ref.routePath,
      workTree: input.gaps.workTree,
    }),
    inspectRouteDark(
      {
        before: gaps.before,
        direction: gaps.direction,
        files: gaps.files,
        project: gaps.project,
        routePath: gaps.ref.routePath,
        url: gaps.url,
      },
      input.preview
    ),
  ]);

  return { dark, kit, match, render };
};

const isKitTrade = (before: PortCheck, after: PortCheck): boolean =>
  toGapCount(after) < toGapCount(before) &&
  (before.match.score ?? 0) - (after.match.score ?? 0) <= KIT_DROP_MAX;

const isLower = (before: PortCheck, after: PortCheck): boolean =>
  before.match.score !== null &&
  after.match.score !== null &&
  after.match.score < before.match.score &&
  !isKitTrade(before, after);

const isRaised = (before: PortCheck, after: PortCheck): boolean =>
  before.match.score !== null &&
  after.match.score !== null &&
  after.match.score > before.match.score;

const toResultText = (
  result: Awaited<ReturnType<typeof runConfirmedAgentTool>>
): string =>
  result.content
    .flatMap((block) => {
      if (block.type === "text") {
        return [block.text];
      }

      return [];
    })
    .join("\n");

const toWrittenNames = (applied: PortApplied): string[] => [
  ...new Set(
    applied.applied.map((write) => write.written.split(WAS_MARK)[0] ?? "")
  ),
];

interface Snapshotted<Value> {
  readonly snapshot: RouteSnapshot | null;
  readonly value: Value;
}

const runWithSnapshot = async <Value>(
  workTree: string,
  task: () => Promise<Value>
): Promise<Snapshotted<Value>> => {
  const snapshot = await createRouteSnapshot(workTree);

  return { snapshot, value: await task() };
};

const applyValues = async (
  input: PortReviewInput
): Promise<PortApplied | null> => {
  try {
    const result = await runConfirmedAgentTool(
      input.runtime,
      APPLY_TOOL,
      { args: { ...input.gaps.ref } },
      {
        directionId: input.gaps.appDirectionId,
        projectId: input.gaps.ref.targetProjectId,
      }
    );

    if (result.isError) {
      return null;
    }

    const decoded = decodeApplied(toResultText(result));

    if (Result.isFailure(decoded)) {
      return null;
    }

    return decoded.success;
  } catch {
    return null;
  }
};

const runValuesPass = async (
  input: PortReviewInput,
  first: PortCheck
): Promise<ValuesPass | null> => {
  const { snapshot, value: applied } = await runWithSnapshot(
    input.gaps.workTree,
    () => applyValues(input)
  );

  if (applied === null) {
    return null;
  }

  const pass: ValuesPass = {
    check: first,
    count: applied.applied.length,
    isUndone: false,
    scoreAfter: applied.scoreAfter,
    scoreBefore: applied.scoreBefore,
    written: toWrittenNames(applied),
  };

  if (pass.count === 0) {
    return pass;
  }

  const after = await inspectRoute(input);

  if (isLower(first, after) && snapshot !== null) {
    await restoreRouteSnapshot(snapshot);

    return { ...pass, isUndone: true };
  }

  return { ...pass, check: after };
};

const runFixLoop = async (
  input: PortReviewInput,
  check: PortCheck
): Promise<PortCheck | null> => {
  const isRan = await input.continueWith(
    toFixPrompt(input.gaps, check),
    check.match.images
  );

  if (!isRan) {
    return null;
  }

  return inspectRoute(input);
};

const isLoopOver = (step: LoopStep): boolean => {
  if (!isFixNeeded(step.best) || step.ran >= LOOPS_MAX) {
    return true;
  }

  return step.ran > 0 && Date.now() - step.startedAt > SECOND_LOOP_MS;
};

const runLoops = async (
  input: PortReviewInput,
  step: LoopStep
): Promise<LoopRun> => {
  const done: LoopRun = { best: step.best, isUndone: false, loops: step.ran };

  if (isLoopOver(step)) {
    return done;
  }

  const { snapshot, value: next } = await runWithSnapshot(
    input.gaps.workTree,
    () => runFixLoop(input, step.best)
  );

  if (next === null) {
    return done;
  }

  if (isLower(step.best, next) && snapshot !== null) {
    await restoreRouteSnapshot(snapshot);

    return { ...done, isUndone: true, loops: step.ran + 1 };
  }

  if (step.ran === 0 && !isRaised(step.best, next)) {
    return { best: next, isUndone: false, loops: 1 };
  }

  return runLoops(input, {
    best: next,
    ran: step.ran + 1,
    startedAt: step.startedAt,
  });
};

const toPassText = (pass: ValuesPass): string => {
  const shown = pass.written.slice(0, WRITTEN_SHOWN);
  const names = [...shown];

  if (pass.written.length > shown.length) {
    names.push("...");
  }

  const text = `wrote ${pass.count} prototype values (${names.join(", ")}); port score ${pass.scoreBefore} -> ${pass.scoreAfter}`;

  if (pass.isUndone) {
    return `${text}; the values lowered the score, so the studio undid them`;
  }

  return text;
};

const toLoopsRan = (loops: number): string => {
  if (loops === 1) {
    return "a fix loop ran";
  }

  return `${loops} fix loops ran`;
};

const toUndoneText = (loops: number): string => {
  if (loops === 1) {
    return "a fix loop lowered the score; its edits were undone";
  }

  return `${loops} fix loops ran; the last lowered the score; its edits were undone`;
};

const toLoopText = (state: ReviewState): string => {
  const kept = `${toCheckText(state.best)}${toHidText(state.best)}`;

  if (state.loops === 0) {
    return toLoopsRan(state.loops);
  }

  if (state.isUndone) {
    return `${toUndoneText(state.loops)}; kept ${kept}`;
  }

  return `${toLoopsRan(state.loops)}; after it ${kept}`;
};

const toNote = (state: ReviewState): string => {
  const head = `Studio port check: ${toCheckText(state.first)}`;

  if (state.pass === null && state.loops === 0) {
    return `${head}${toHidText(state.first)}.`;
  }

  if (state.pass === null) {
    return `${head}, ${toLoopText(state)}.`;
  }

  if (state.pass.count === 0) {
    return `${head}. Studio check: wrote 0 prototype values; ${toLoopText(state)}.`;
  }

  return `${head}. Studio check: ${toPassText(state.pass)}; ${toLoopText(state)}.`;
};

const toReview = (state: ReviewState): PortReview => ({
  note: toNote(state),
  record: toRecord(state.best, state.loops > 0),
});

const runValuesFirst = (
  input: PortReviewInput,
  first: PortCheck
): Promise<ValuesPass | null> => {
  if (!input.gaps.isUpdate) {
    return Promise.resolve(null);
  }

  return runValuesPass(input, first);
};

const runPageReview = async (input: PortReviewInput): Promise<PortReview> => {
  const firstCheck = await inspectRoute(input);

  if (!isFixNeeded(firstCheck)) {
    return toReview({
      best: firstCheck,
      first: firstCheck,
      isUndone: false,
      loops: 0,
      pass: null,
    });
  }

  const pass = await runValuesFirst(input, firstCheck);
  const start = pass?.check ?? firstCheck;

  const loops = await runLoops(input, {
    best: start,
    ran: 0,
    startedAt: Date.now(),
  });

  return toReview({ ...loops, first: firstCheck, pass });
};

const runReview = (input: PortReviewInput): Promise<PortReview> => {
  if (input.gaps.routes.length > 1) {
    return runRoutesReview(input, { inspectRoute, runValuesFirst });
  }

  return runPageReview(input);
};

const inspectAllKit = async (
  input: PortReviewInput
): Promise<number | null> => {
  const finds = await inspectRouteKit({
    files: input.gaps.files,
    project: input.gaps.project,
    routePath: null,
    workTree: input.gaps.workTree,
  });

  return finds?.length ?? null;
};

const toKitReview = async (
  input: PortReviewInput,
  review: PortReview,
  found: number | null
): Promise<PortReview> => {
  if (found === null) {
    return review;
  }

  const left = await inspectAllKit(input);

  return { ...review, note: `${review.note}${toKitNote({ found, left })}` };
};

const runPortReview = async (input: PortReviewInput): Promise<PortReview> => {
  const found = await inspectAllKit(input);

  return toKitReview(input, await runReview(input), found);
};

export { runPortReview };
