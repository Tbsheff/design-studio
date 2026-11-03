import { z } from "zod";

import type { Direction, Project, Version } from "../../shared/contracts.js";
import {
  DESIGN_RULES_TEXT_MAX,
  type DesignRulesState,
  type DesignRulesTestResult,
} from "../../shared/design-rules.js";
import {
  REVIEW_FIX_MAX,
  type ReviewFinding,
  type ReviewFixResult,
  type ReviewResult,
} from "../../shared/review.js";
import { ruleHits } from "../design-rules/check.js";
import { isTestable, parseRules } from "../design-rules/parse.js";
import { loadDesignRules, saveDesignRules } from "../design-rules/store.js";
import { applyFindingFixes } from "../review/fixes.js";
import { resolveReviewFrame } from "../review/frame.js";
import { lastReview, rememberReview, runReview } from "../review/run.js";
import { BadRequestError } from "../store/errors.js";
import type { DirectEditRuntime } from "./direct-edit-core.js";
import type { DirectionRef, EditBody } from "./direct-edit-ops.js";

const side = z.number().int().min(200).max(4000);
const rulesText = z.string().max(DESIGN_RULES_TEXT_MAX);
const saveSchema = z.object({ text: rulesText }).strict();

const testSchema = z
  .object({
    frame: z.string().trim().min(1).max(60).optional(),
    height: side.optional(),
    path: z.string().trim().max(300).optional(),
    text: rulesText.optional(),
    width: side.optional(),
  })
  .strict();

const reviewSchema = z
  .object({
    frame: z.string().trim().min(1).max(60).optional(),
    height: side.optional(),
    path: z.string().trim().max(300).optional(),
    selector: z.string().trim().min(1).max(2000).optional(),
    width: side.optional(),
  })
  .strict();

const fixSchema = z
  .object({
    allowShared: z.boolean().optional(),
    findingIds: z.array(z.string().min(1).max(80)).min(1).max(REVIEW_FIX_MAX),
  })
  .strict();

const parse = <Schema extends z.ZodType>(
  schema: Schema,
  body: unknown
): z.output<Schema> => {
  const parsed = schema.safeParse(body ?? {});

  if (!parsed.success) {
    const [issue] = parsed.error.issues;

    throw new BadRequestError(
      issue
        ? `${issue.path.join(".") || "body"}: ${issue.message}`
        : "body is not valid"
    );
  }

  return parsed.data;
};

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

const getRulesOf = async (runtime: DirectEditRuntime, ref: DirectionRef) => {
  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  return readRulesState(runtime, project, direction);
};

const writeRules = async (
  runtime: DirectEditRuntime,
  project: Project,
  direction: Direction,
  value: string
): Promise<{
  state: DesignRulesState;
  version: Version | null;
  versionId: string | null;
}> => {
  const place = {
    direction,
    project,
    studioDir: runtime.projectDir(project.id),
  };
  const saved = await saveDesignRules(place, value);

  const version = saved.inRepo
    ? await runtime.commitDesignMd(project, direction)
    : null;

  return {
    state: await loadDesignRules(place),
    version,
    versionId: version?.id ?? null,
  };
};

const setRulesIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
) => {
  const input = parse(saveSchema, body);

  return runtime.withDirection(
    ref.projectId,
    ref.directionId,
    (project, direction) => writeRules(runtime, project, direction, input.text)
  );
};

const runRulesTestIn = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
): Promise<DesignRulesTestResult> => {
  const input = parse(testSchema, body);

  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  const rules =
    input.text === undefined
      ? (await readRulesState(runtime, project, direction)).rules
      : parseRules(input.text);

  const frame = await resolveReviewFrame(
    runtime.canvas,
    project,
    direction,
    input
  );

  const notes: string[] = [];
  const testable = rules.filter(isTestable);

  if (testable.length === 0) {
    notes.push(
      "No rule here can be checked on a page. The agent and the critic still get them."
    );
  }

  const review =
    testable.length > 0
      ? await runReview(runtime.preview, {
          direction,
          frame,
          project,
          rules: testable,
        })
      : null;

  const findings =
    review?.findings.filter((finding) => finding.kind === "rule") ?? [];

  return {
    frame: {
      ...(frame.path ? { path: frame.path } : {}),
      height: frame.height,
      width: frame.width,
    },
    hits: ruleHits(rules, findings),
    notes,
    rules,
  };
};

const getReviewOf = async (runtime: DirectEditRuntime, ref: DirectionRef) => {
  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  return { review: lastReview(project.id, direction.id) };
};

const runReviewIn = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
): Promise<ReviewResult> => {
  const input = parse(reviewSchema, body);

  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  const frame = await resolveReviewFrame(
    runtime.canvas,
    project,
    direction,
    input
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

  const fresh = await runReview(runtime.preview, {
    direction,
    frame: last.frame,
    project,
    rules: await runtime.rulesFor(project, direction),
  });

  rememberReview(fresh);

  return fresh;
};

const skipReason = (
  finding: ReviewFinding | undefined,
  allowShared: boolean
): string | null => {
  if (!finding) {
    return "This finding is gone from the latest review. Run the review again.";
  }

  if (!finding.fix) {
    return "This finding needs judgment, so it has no direct fix. Ask the agent or edit it yourself.";
  }

  if (finding.shared && !allowShared) {
    return `The fix edits the shared file ${finding.shared}, outside the page's own route folder, so it changes every page that uses it. Pass allowShared: true to apply it.`;
  }

  return null;
};

const fixFindings = async (
  runtime: DirectEditRuntime,
  project: Project,
  direction: Direction,
  ids: string[],
  allowShared: boolean
): Promise<ReviewFixResult> => {
  const review = await currentReview(runtime, project, direction);
  const byId = new Map(review.findings.map((finding) => [finding.id, finding]));
  const chosen: ReviewFinding[] = [];
  const skipped: ReviewFixResult["skipped"] = [];

  for (const id of new Set(ids)) {
    const finding = byId.get(id);
    const reason = skipReason(finding, allowShared);

    if (reason !== null) {
      skipped.push({ id, reason });
    } else if (finding) {
      chosen.push(finding);
    }
  }

  if (chosen.length === 0) {
    return { applied: [], files: [], skipped, version: null };
  }

  const done = await applyFindingFixes(
    runtime.editDeps,
    project,
    direction,
    chosen
  );

  const shared = [
    ...new Set(
      chosen.flatMap((finding) => (finding.shared ? [finding.shared] : []))
    ),
  ];

  return {
    applied: chosen.map((finding) => finding.id),
    skipped,
    ...done,
    ...(shared.length > 0 ? { shared } : {}),
  };
};

const applyReviewFixIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
) => {
  const input = parse(fixSchema, body);

  return runtime.withDirection(
    ref.projectId,
    ref.directionId,
    (project, direction) =>
      fixFindings(
        runtime,
        project,
        direction,
        input.findingIds,
        input.allowShared === true
      )
  );
};

export {
  applyReviewFixIn,
  getReviewOf,
  getRulesOf,
  runReviewIn,
  runRulesTestIn,
  setRulesIn,
};
