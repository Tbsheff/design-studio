import type { SelectionContextsSchema } from "@design-studio/actions/comment/schema";
import type {
  DesignComment,
  Direction,
  Project,
  RunComment,
  RunMention,
  RunRequest,
  SelectionContext,
} from "@design-studio/contracts";

import { agentText } from "../../shared/comments.js";
import type { CommentStore } from "../store/comments.js";
import { pickComments } from "./prefill.js";

const MENTION_MAX = 10;

type RunPayload = Pick<RunRequest, "attachmentIds" | "comments" | "mentions">;

type SelectionContexts = typeof SelectionContextsSchema.Type | null;

const mentionId = (mention: RunMention): string => {
  if (mention.kind === "file") {
    return `file:${mention.path}`;
  }

  if (mention.kind === "frame") {
    return `frame:${mention.frameId}`;
  }

  return `${mention.kind}:${mention.name}`;
};

const mergedMentions = (chosen: readonly DesignComment[]): RunMention[] => {
  const seen = new Map<string, RunMention>();

  for (const mention of chosen.flatMap((comment) => comment.mentions ?? [])) {
    if (!seen.has(mentionId(mention))) {
      seen.set(mentionId(mention), mention);
    }
  }

  return [...seen.values()].slice(0, MENTION_MAX);
};

const toElement = (
  comment: DesignComment,
  contexts: SelectionContexts
): SelectionContext | null => {
  const given = contexts?.[comment.id];

  if (given) {
    return given;
  }

  return comment.context ?? null;
};

const toRunComment = (
  comment: DesignComment,
  contexts: SelectionContexts,
  attachmentIds: readonly string[]
): RunComment => {
  const base = { id: comment.id, n: comment.n, text: agentText(comment) };

  if (!comment.drawing) {
    return {
      ...base,
      element: toElement(comment, contexts),
    };
  }

  const image = attachmentIds.indexOf(comment.attachmentIds?.[0] ?? "") + 1;

  return {
    ...base,
    drawing: {
      box: comment.drawing.box,
      frame: comment.drawing.frame,
      image,
    },
    element: null,
  };
};

const toRunPayload = (
  chosen: readonly DesignComment[],
  contexts: SelectionContexts
): RunPayload => {
  const attachmentIds: string[] = [];

  const seenIds = new Set<string>();

  const mentions = mergedMentions(chosen);

  const comments = chosen.map((comment) => {
    for (const attachmentId of comment.attachmentIds ?? []) {
      if (!seenIds.has(attachmentId)) {
        seenIds.add(attachmentId);
        attachmentIds.push(attachmentId);
      }
    }

    return toRunComment(comment, contexts, attachmentIds);
  });

  const payload: RunPayload = { comments };

  if (attachmentIds.length > 0) {
    payload.attachmentIds = attachmentIds;
  }

  if (mentions.length > 0) {
    payload.mentions = mentions;
  }

  return payload;
};

const withCommentInputs = async (
  store: CommentStore,
  project: Project,
  direction: Direction,
  request: RunRequest
): Promise<RunRequest> => {
  const { commentIds, ...rest } = request;

  if (!commentIds?.length) {
    return rest;
  }

  const chosen = pickComments(
    await store.list(project.id, direction.id),
    commentIds
  );

  const payload = toRunPayload(chosen, null);

  const attachmentIds = [
    ...new Set([
      ...(payload.attachmentIds ?? []),
      ...(rest.attachmentIds ?? []),
    ]),
  ];

  const out: RunRequest = { ...rest, comments: payload.comments };

  if (attachmentIds.length > 0) {
    out.attachmentIds = attachmentIds;
  }

  return out;
};

export { MENTION_MAX, toRunPayload, withCommentInputs };

export type { RunPayload, SelectionContexts };
