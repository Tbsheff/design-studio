import { createHash } from "node:crypto";

import { BadRequestError, NotFoundError } from "../../platform/errors/index.js";
import {
  toCandidateLinks,
  toExplicitPath,
  toStartFrameId,
} from "./engine/index.js";
import type { FlowLink } from "./engine/index.js";
import type { FlowFrameInfo, FlowRequest, FlowTarget } from "./flow-load.js";

const HASH_CHARS = 12;

const NO_LINKS =
  "No saved link with a click can leave the start frame. Add one with create_link.";

interface FlowPlan {
  readonly explicit: readonly FlowLink[] | null;
  readonly startId: string;
}

const toInputHash = (
  request: FlowRequest,
  target: FlowTarget,
  plan: FlowPlan
): string =>
  createHash("sha256")
    .update(
      JSON.stringify({
        directionId: target.direction.id,
        format: request.format,
        linkIds: plan.explicit?.map((link) => link.id) ?? null,
        maxSteps: request.maxSteps,
        projectId: target.project.id,
        startId: plan.startId,
        stepMs: request.stepMs,
        width: request.width,
      })
    )
    .digest("hex")
    .slice(0, HASH_CHARS);

const getExplicitPlan = (
  target: FlowTarget,
  request: FlowRequest,
  linkIds: readonly string[]
): FlowPlan => {
  const result = toExplicitPath(target.links, target.frames, linkIds);

  if (!result.isOk) {
    throw new NotFoundError(
      `Link ${result.linkId} cannot be followed (${result.code}).`
    );
  }

  const first = result.links.at(0) ?? null;
  const startId = request.startFrameId ?? first?.fromFrame ?? null;

  if (startId === null || first === null || first.fromFrame !== startId) {
    throw new BadRequestError(NO_LINKS);
  }

  return { explicit: result.links, startId };
};

const getPlan = (target: FlowTarget, request: FlowRequest): FlowPlan => {
  if (request.linkIds !== null && request.linkIds.length > 0) {
    return getExplicitPlan(target, request, request.linkIds);
  }

  const startId = toStartFrameId(
    target.frames,
    target.document,
    request.startFrameId
  );

  if (startId === null) {
    throw new NotFoundError(
      `Frame ${request.startFrameId ?? ""} was not found.`
    );
  }

  const first = toCandidateLinks(target.links, startId, new Set([startId]));

  if (first.length === 0) {
    throw new BadRequestError(NO_LINKS);
  }

  return { explicit: null, startId };
};

const getStartFrame = (target: FlowTarget, startId: string): FlowFrameInfo => {
  const frame = target.frames.find((item) => item.id === startId) ?? null;

  if (frame === null) {
    throw new NotFoundError(`Frame ${startId} was not found.`);
  }

  return frame;
};

export { getPlan, getStartFrame, toInputHash };

export type { FlowPlan };
