import type { MutableRefObject } from "react";

import type { CommentExtras, DescribeAnchors } from "./comments-control.js";
import { anchorQueryOf, drawingTarget, targetFromSelection } from "./deps.js";
import type {
  CommentDrawing,
  CommentFrame,
  CommentTarget,
  DesignComment,
  RunMention,
  SelectionContext,
} from "./deps.js";

const DESCRIBE_TIMEOUT_MS = 800;

const MAX_DRAWING_ATTACHMENTS = 4;

const toBase = (projectId: string, directionId: string): string =>
  `/api/projects/${encodeURIComponent(projectId)}/d/${encodeURIComponent(directionId)}/comments`;

const toQueued = (comments: DesignComment[]): DesignComment[] =>
  comments.filter((comment) => comment.status === "queued");

const toTimeout = (): Promise<null> => {
  const { promise, resolve } = Promise.withResolvers<null>();
  globalThis.setTimeout(() => resolve(null), DESCRIBE_TIMEOUT_MS);

  return promise;
};

const toContexts = async (
  describe: DescribeAnchors,
  comments: DesignComment[]
): Promise<(SelectionContext | null)[] | null> => {
  try {
    return await describe(comments.map((comment) => anchorQueryOf(comment)));
  } catch {
    return null;
  }
};

const describeWithTimeout = async (
  describe: DescribeAnchors | null,
  comments: DesignComment[]
): Promise<Record<string, SelectionContext>> => {
  if (!describe || comments.length === 0) {
    return {};
  }

  const contexts = await Promise.race([
    toContexts(describe, comments),
    toTimeout(),
  ]);

  const entries: [string, SelectionContext][] = [];

  for (const [index, comment] of comments.entries()) {
    const context = contexts?.[index];

    if (context) {
      entries.push([comment.id, context]);
    }
  }

  return Object.fromEntries(entries);
};

const toTarget = (
  selection: SelectionContext,
  offset: CommentTarget["offset"] | null
): CommentTarget => {
  const target = targetFromSelection(selection);

  if (offset) {
    return { ...target, offset };
  }

  return target;
};

interface CreateRequest {
  readonly extras: CommentExtras;
  readonly frameRef: MutableRefObject<CommentFrame | null>;
  readonly isNow: boolean;
  readonly offset: CommentTarget["offset"] | null;
  readonly selection: SelectionContext;
  readonly text: string;
}

const toStatus = (isNow: boolean): "draft" | "queued" => {
  if (isNow) {
    return "draft";
  }

  return "queued";
};

interface CreateBody {
  attachmentIds?: string[];
  context: SelectionContext;
  frame?: CommentFrame;
  mentions?: RunMention[];
  status: "draft" | "queued";
  target: CommentTarget;
  text: string;
}

const toCreateBody = (request: CreateRequest): CreateBody => {
  const { extras, frameRef, isNow, offset, selection, text } = request;
  const context = selection;
  const status = toStatus(isNow);
  const target = toTarget(selection, offset);
  const body: CreateBody = { context, status, target, text };

  if (frameRef.current) {
    body.frame = frameRef.current;
  }

  if (extras.mentions?.length) {
    body.mentions = extras.mentions;
  }

  if (extras.attachmentIds?.length) {
    body.attachmentIds = extras.attachmentIds;
  }

  return body;
};

interface DrawingRequest {
  readonly attachmentId: string;
  readonly drawing: CommentDrawing;
  readonly extras: CommentExtras | null;
  readonly frameRef: MutableRefObject<CommentFrame | null>;
  readonly isNow: boolean;
  readonly text: string;
}

interface DrawingBody {
  attachmentIds: string[];
  drawing: CommentDrawing;
  frame?: CommentFrame;
  mentions?: RunMention[];
  status: "draft" | "queued";
  target: CommentTarget;
  text: string;
}

const toDrawingBody = (request: DrawingRequest): DrawingBody => {
  const { attachmentId, drawing, extras, frameRef, isNow, text } = request;
  const status = toStatus(isNow);
  const target = drawingTarget(drawing.box);

  const attachmentIds = [attachmentId, ...(extras?.attachmentIds ?? [])].slice(
    0,
    MAX_DRAWING_ATTACHMENTS
  );

  const body: DrawingBody = { attachmentIds, drawing, status, target, text };

  if (extras?.mentions?.length) {
    body.mentions = extras.mentions;
  }

  if (frameRef.current) {
    body.frame = frameRef.current;
  }

  return body;
};

export {
  describeWithTimeout,
  toBase,
  toCreateBody,
  toDrawingBody,
  toQueued,
  toTarget,
};
