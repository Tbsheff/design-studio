import { RUN_EFFORTS, RUN_LEVELS, isRunLevel } from "@design-studio/contracts";
import type {
  ProjectSettings,
  RunLevel,
  RunRequest,
  RunEffort,
} from "@design-studio/contracts";
import {
  cleanFramePath,
  isFrameId,
} from "@design-studio/contracts/canvas-file";
import { parseStatesRequest } from "@design-studio/contracts/states";
import { parseEditScope } from "@design-studio/contracts/usage-scope";
import { Result, Schema } from "effect";

import { toDecoder } from "../platform/decode/index.js";
import { BadRequestError, assertSafeId } from "../platform/errors/index.js";
import { isRecord, requireString } from "./app-request.js";
import { parseMentions } from "./mentions.js";

const decodeStartRunFlag = toDecoder(
  Schema.UndefinedOr(Schema.Boolean),
  "ignore"
);

function parseStartRun(raw: unknown): boolean {
  const result = decodeStartRunFlag(raw);

  if (Result.isFailure(result)) {
    throw new BadRequestError("startRun must be true or false");
  }
  return result.success ?? true;
}

function parseLevel(raw: unknown): RunLevel | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (!isRunLevel(raw)) {
    throw new BadRequestError(`level must be one of ${RUN_LEVELS.join(", ")}`);
  }
  return raw;
}

function parseRunExtras(
  body: Record<string, unknown>
): Pick<
  RunRequest,
  "effort" | "retryOf" | "plan" | "lean" | "editScope" | "mentions"
> {
  const extras: Pick<
    RunRequest,
    "effort" | "retryOf" | "plan" | "lean" | "editScope" | "mentions"
  > = {};

  if (body.plan === true) {
    extras.plan = true;
  }
  if (body.lean === true) {
    extras.lean = true;
  }
  const editScope = parseEditScope(body.editScope);

  if (editScope) {
    extras.editScope = editScope;
  }
  if (body.effort !== undefined) {
    if (!RUN_EFFORTS.includes(body.effort as RunEffort)) {
      throw new BadRequestError("effort must be low, medium or high");
    }
    extras.effort = body.effort as RunEffort;
  }

  if (body.retryOf !== undefined) {
    extras.retryOf = assertSafeId(String(body.retryOf), "retryOf");
  }
  const mentions = parseMentions(body.mentions);

  if (mentions?.length) {
    extras.mentions = mentions;
  }
  return extras;
}

function parseRunRequest(body: Record<string, unknown>): RunRequest {
  const prompt = requireString(body, "prompt");
  const mode = body.mode ?? "edit";

  if (mode !== "edit" && mode !== "critique" && mode !== "ask") {
    throw new BadRequestError("mode must be edit, critique or ask");
  }
  const request: RunRequest = { mode, prompt };
  const level = parseLevel(body.level);

  if (level) {
    request.level = level;
  }
  Object.assign(request, parseRunExtras(body));

  if (body.selection !== undefined) {
    if (!Array.isArray(body.selection)) {
      throw new BadRequestError("selection must be an array");
    }
    request.selection = body.selection as RunRequest["selection"];
  }

  if (body.attachmentIds !== undefined) {
    if (
      !Array.isArray(body.attachmentIds) ||
      !body.attachmentIds.every((id) => typeof id === "string")
    ) {
      throw new BadRequestError("attachmentIds must be an array of strings");
    }

    request.attachmentIds = body.attachmentIds as string[];
  }

  parseRunTask(body, request);
  const commentIds = parseCommentIds(body.commentIds);

  if (commentIds) {
    request.commentIds = commentIds;
  }
  const canvas = parseRunCanvas(body.canvas);

  if (canvas) {
    request.canvas = canvas;
  }
  return request;
}

function parseCommentIds(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (
    !Array.isArray(raw) ||
    raw.length > 20 ||
    !raw.every(
      (id) => typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id)
    )
  ) {
    throw new BadRequestError("commentIds must be up to 20 comment ids");
  }
  return raw.length > 0 ? [...new Set(raw as string[])] : undefined;
}

const MAX_CANVAS_SIDE = 8000;

function canvasSide(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 1 ||
    value > MAX_CANVAS_SIDE
  ) {
    throw new BadRequestError(
      "canvas width and height must be numbers from 1 to 8000"
    );
  }
  return Math.round(value);
}

function parseRunCanvas(raw: unknown): RunRequest["canvas"] {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (!isRecord(raw) || !isFrameId(raw.frameId)) {
    throw new BadRequestError("canvas must be {frameId, path, width, height}");
  }
  const framePath = cleanFramePath(
    typeof raw.path === "string" ? raw.path : ""
  );

  if (framePath === null) {
    throw new BadRequestError("canvas.path is not a page path");
  }
  const label =
    typeof raw.label === "string" && raw.label.trim()
      ? raw.label.trim().slice(0, 80)
      : undefined;

  const inView = Array.isArray(raw.inView)
    ? raw.inView.filter(isFrameId).slice(0, 20)
    : [];

  return {
    frameId: raw.frameId,
    height: canvasSide(raw.height),
    path: framePath,
    width: canvasSide(raw.width),
    ...(label ? { label } : {}),
    ...(inView.length > 0 ? { inView } : {}),
  };
}

function parseRunTask(
  body: Record<string, unknown>,
  request: RunRequest
): void {
  if (body.task !== undefined) {
    if (
      body.task !== "tweaks" &&
      body.task !== "design-system" &&
      body.task !== "port"
    ) {
      throw new BadRequestError("task must be tweaks, design-system or port");
    }
    if (request.mode !== "edit") {
      throw new BadRequestError(`task ${body.task} needs mode edit`);
    }
    request.task = body.task;
  }

  if (body.states === undefined) {
    return;
  }
  const states = parseStatesRequest(body.states);

  if (!states) {
    throw new BadRequestError("states must be {path, frame, width, height}");
  }
  if (request.mode !== "edit" || request.task) {
    throw new BadRequestError("states needs an edit run with no task");
  }
  request.states = states;
}

const SkillIdSchema = Schema.String.check(
  Schema.isPattern(/^[^:\s]+:[^:\s]+$/u, {
    message: "must be a skill id like plugin:skill; see GET /api/skills",
  })
);

const SettingsSchema = Schema.Struct({
  allowBash: Schema.optionalKey(Schema.Boolean),
  allowInstall: Schema.optionalKey(Schema.Boolean),
  autoApprove: Schema.optionalKey(Schema.Boolean),
  defaultLevel: Schema.optionalKey(Schema.Literals(RUN_LEVELS)),
  disabledSkills: Schema.optionalKey(
    Schema.Array(SkillIdSchema).check(Schema.isMaxLength(1000))
  ),
  imageSearch: Schema.optionalKey(Schema.Boolean),
  isPinned: Schema.optionalKey(Schema.Boolean),
  maxBudgetUsd: Schema.optionalKey(
    Schema.NullOr(
      Schema.Number.check(Schema.isBetween({ maximum: 50, minimum: 0.01 }))
    )
  ),
  maxTurns: Schema.optionalKey(
    Schema.Int.check(Schema.isBetween({ maximum: 200, minimum: 1 }))
  ),
  model: Schema.optionalKey(
    Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(200))
  ),
});

const decodeSettings = toDecoder(SettingsSchema, "error");

function parseSettings(raw: unknown): Partial<ProjectSettings> | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  const parsed = decodeSettings(raw);

  if (Result.isFailure(parsed)) {
    throw new BadRequestError(`invalid settings: ${parsed.failure.message}`);
  }

  const settings: Partial<ProjectSettings> = {};

  for (const [key, value] of Object.entries(parsed.success)) {
    if (key === "disabledSkills" && Array.isArray(value)) {
      Object.assign(settings, { [key]: [...new Set(value)] });
    } else if (value !== undefined) {
      Object.assign(settings, { [key]: value });
    }
  }

  return settings;
}

export {
  parseCommentIds,
  parseLevel,
  parseRunCanvas,
  parseRunExtras,
  parseRunRequest,
  parseRunTask,
  parseSettings,
  parseStartRun,
};
