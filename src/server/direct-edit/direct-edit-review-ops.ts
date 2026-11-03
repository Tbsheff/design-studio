import type { Input } from "../../shared/actions/_core/action.js";
import type { applyReviewFixDirectEdit } from "../../shared/actions/direct-edit/apply-review-fix.js";
import type { runReviewDirectEdit } from "../../shared/actions/direct-edit/run-review.js";
import type { runRulesTestDirectEdit } from "../../shared/actions/direct-edit/run-rules-test.js";
import type { setRulesDirectEdit } from "../../shared/actions/direct-edit/set-rules.js";
import type { Direction, Project, Version } from "../../shared/contracts.js";
import type {
  DesignRule,
  DesignRulesState,
  DesignRulesTestResult,
} from "../../shared/design-rules.js";
import type {
  ReviewFinding,
  ReviewFixResult,
  ReviewResult,
} from "../../shared/review.js";
import {
  isTestable,
  loadDesignRules,
  parseRules,
  ruleHits,
  saveDesignRules,
} from "../design-rules/index.js";
import { BadRequestError } from "../platform/errors/index.js";
import {
  applyFindingFixes,
  lastReview,
  rememberReview,
  resolveReviewFrame,
  runReview,
} from "../review/index.js";
import type { DirectEditRuntime } from "./direct-edit-core.js";
import type { DirectionRef } from "./direct-edit-ops.js";

type RefKeys = "directionId" | "projectId";

type RulesSaveBody = Omit<Input<typeof setRulesDirectEdit>, RefKeys>;

type RulesTestBody = Omit<Input<typeof runRulesTestDirectEdit>, RefKeys>;

type ReviewRunBody = Omit<Input<typeof runReviewDirectEdit>, RefKeys>;

type ReviewFixBody = Omit<Input<typeof applyReviewFixDirectEdit>, RefKeys>;

interface SavedRules {
  readonly state: DesignRulesState;
  readonly version: Version | null;
  readonly versionId: string | null;
}

const NO_TESTABLE_NOTE =
  "No rule here can be checked on a page. The agent and the critic still get them.";

const readRulesState = (
  runtime: DirectEditRuntime,
  project: Project,
  direction: Direction
): Promise<DesignRulesState> =>
  loadDesignRules({
    direction,
    project,
    studioDir: runtime.projectDir(project.id),
  });

const getRulesOf = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef
): Promise<DesignRulesState> => {
  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  return readRulesState(runtime, project, direction);
};

const commitRules = (
  runtime: DirectEditRuntime,
  project: Project,
  direction: Direction,
  isInRepo: boolean
): Promise<Version | null> => {
  if (!isInRepo) {
    return Promise.resolve(null);
  }

  return runtime.commitDesignMd(project, direction);
};

const writeRules = async (
  runtime: DirectEditRuntime,
  target: { readonly direction: Direction; readonly project: Project },
  value: string
): Promise<SavedRules> => {
  const place = {
    direction: target.direction,
    project: target.project,
    studioDir: runtime.projectDir(target.project.id),
  };

  const saved = await saveDesignRules(place, value);

  const [version, state] = await Promise.all([
    commitRules(runtime, target.project, target.direction, saved.inRepo),
    loadDesignRules(place),
  ]);

  return { state, version, versionId: version?.id ?? null };
};

const setRulesIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: RulesSaveBody
): Promise<SavedRules> =>
  runtime.withDirection(ref.projectId, ref.directionId, (project, direction) =>
    writeRules(runtime, { direction, project }, body.text)
  );

const rulesOf = async (
  runtime: DirectEditRuntime,
  target: { readonly direction: Direction; readonly project: Project },
  text: string | null
): Promise<DesignRule[]> => {
  if (text !== null) {
    return parseRules(text);
  }

  const state = await readRulesState(runtime, target.project, target.direction);

  return state.rules;
};

const testFrameOf = (frame: {
  readonly height: number;
  readonly path?: string | null;
  readonly width: number;
}): DesignRulesTestResult["frame"] => {
  if (frame.path) {
    return { height: frame.height, path: frame.path, width: frame.width };
  }

  return { height: frame.height, width: frame.width };
};

const runRulesTestIn = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: RulesTestBody
): Promise<DesignRulesTestResult> => {
  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  const [rules, frame] = await Promise.all([
    rulesOf(runtime, { direction, project }, body.text ?? null),
    resolveReviewFrame(runtime.canvas, project, direction, body),
  ]);

  const testable = rules.filter((rule) => isTestable(rule));

  if (testable.length === 0) {
    return {
      frame: testFrameOf(frame),
      hits: ruleHits(rules, []),
      notes: [NO_TESTABLE_NOTE],
      rules,
    };
  }

  const review = await runReview(runtime.preview, {
    direction,
    frame,
    project,
    rules: testable,
  });

  const findings = review.findings.filter((finding) => finding.kind === "rule");

  return {
    frame: testFrameOf(frame),
    hits: ruleHits(rules, findings),
    notes: [],
    rules,
  };
};

const getReviewOf = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef
): Promise<{ readonly review: ReviewResult | null }> => {
  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  return { review: lastReview(project.id, direction.id) };
};

const runReviewIn = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: ReviewRunBody
): Promise<ReviewResult> => {
  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  const frame = await resolveReviewFrame(
    runtime.canvas,
    project,
    direction,
    body
  );

  const result = await runReview(runtime.preview, {
    direction,
    frame,
    project,
    rules: await runtime.rulesFor(project, direction),
  });

  rememberReview(result);

  return result;
};

const currentReview = async (
  runtime: DirectEditRuntime,
  project: Project,
  direction: Direction
): Promise<ReviewResult> => {
  const last = lastReview(project.id, direction.id);

  if (!last) {
    throw new BadRequestError(
      "Run a review of this frame first (review_frame or the Review panel)."
    );
  }

  if (last.versionId === direction.headVersionId) {
    return last;
  }

  const { frame } = last;
  const rules = await runtime.rulesFor(project, direction);

  const fresh = await runReview(runtime.preview, {
    direction,
    frame,
    project,
    rules,
  });

  rememberReview(fresh);

  return fresh;
};

const skipReason = (
  finding: ReviewFinding | undefined,
  isSharedAllowed: boolean
): string | null => {
  if (!finding) {
    return "This finding is gone from the latest review. Run the review again.";
  }

  if (!finding.fix) {
    return "This finding needs judgment, so it has no direct fix. Ask the agent or edit it yourself.";
  }

  if (finding.shared && !isSharedAllowed) {
    return `The fix edits the shared file ${finding.shared}, outside the page's own route folder, so it changes every page that uses it. Pass allowShared: true to apply it.`;
  }

  return null;
};

interface SortedFindings {
  readonly chosen: ReviewFinding[];
  readonly skipped: ReviewFixResult["skipped"];
}

const sortFindings = (
  review: ReviewResult,
  ids: readonly string[],
  isSharedAllowed: boolean
): SortedFindings => {
  const byId = new Map(review.findings.map((finding) => [finding.id, finding]));
  const chosen: ReviewFinding[] = [];
  const skipped: ReviewFixResult["skipped"] = [];

  for (const id of new Set(ids)) {
    const finding = byId.get(id);
    const reason = skipReason(finding, isSharedAllowed);

    if (reason !== null) {
      skipped.push({ id, reason });
    }

    if (reason === null && finding) {
      chosen.push(finding);
    }
  }

  return { chosen, skipped };
};

const sharedFilesOf = (chosen: readonly ReviewFinding[]): string[] => [
  ...new Set(
    chosen.flatMap((finding) => {
      if (finding.shared) {
        return [finding.shared];
      }

      return [];
    })
  ),
];

const fixFindings = async (
  runtime: DirectEditRuntime,
  target: { readonly direction: Direction; readonly project: Project },
  body: ReviewFixBody
): Promise<ReviewFixResult> => {
  const { direction, project } = target;
  const review = await currentReview(runtime, project, direction);

  const { chosen, skipped } = sortFindings(
    review,
    body.findingIds,
    body.allowShared === true
  );

  if (chosen.length === 0) {
    return { applied: [], files: [], skipped: [...skipped], version: null };
  }

  const done = await applyFindingFixes(
    runtime.editDeps,
    project,
    direction,
    chosen
  );

  const result: ReviewFixResult = {
    applied: chosen.map((finding) => finding.id),
    skipped,
    ...done,
  };

  const shared = sharedFilesOf(chosen);

  if (shared.length > 0) {
    return { ...result, shared };
  }

  return result;
};

const applyReviewFixIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: ReviewFixBody
): Promise<ReviewFixResult> =>
  runtime.withDirection(ref.projectId, ref.directionId, (project, direction) =>
    fixFindings(runtime, { direction, project }, body)
  );

export {
  applyReviewFixIn,
  getReviewOf,
  getRulesOf,
  runReviewIn,
  runRulesTestIn,
  setRulesIn,
};

export type {
  ReviewFixBody,
  ReviewRunBody,
  RulesSaveBody,
  RulesTestBody,
  SavedRules,
};
