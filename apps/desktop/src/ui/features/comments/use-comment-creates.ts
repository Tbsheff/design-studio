import { useCallback } from "react";
import type { MutableRefObject } from "react";

import { toMerged } from "./comment-merge.js";
import { toCreateBody, toDrawingBody } from "./comments-api.js";
import type { CommentExtras, DrawingInput } from "./comments-control.js";
import { api, errorText } from "./deps.js";
import type {
  CommentFrame,
  CommentTarget,
  DesignComment,
  SelectionContext,
} from "./deps.js";
import type { CommentCall } from "./use-comment-call.js";
import type { CommentSend } from "./use-comment-send.js";
import type { CommentsStore } from "./use-comment-store.js";

interface CreateContext {
  readonly call: CommentCall;
  readonly frameRef: MutableRefObject<CommentFrame | null>;
  readonly projectId: string;
  readonly runningRef: MutableRefObject<boolean>;
  readonly send: CommentSend;
  readonly store: CommentsStore;
}

interface CommentCreates {
  readonly add: (
    selections: SelectionContext[],
    text: string,
    toClaude: boolean,
    extras?: CommentExtras
  ) => Promise<boolean>;
  readonly addDrawing: (input: DrawingInput) => Promise<boolean>;
}

const toOffset = (
  count: number,
  extras: CommentExtras
): CommentTarget["offset"] | null => {
  if (count === 1) {
    return extras.offset ?? null;
  }

  return null;
};

const toCreatedList = async (
  items: SelectionContext[],
  create: (selection: SelectionContext) => Promise<DesignComment | null>,
  done: DesignComment[]
): Promise<DesignComment[]> => {
  const [first, ...rest] = items;

  if (!first) {
    return done;
  }

  const comment = await create(first);

  if (comment) {
    return toCreatedList(rest, create, [...done, comment]);
  }

  return toCreatedList(rest, create, done);
};

interface AddRequest {
  readonly extras: CommentExtras;
  readonly selections: SelectionContext[];
  readonly text: string;
  readonly toClaude: boolean;
}

const postAdd = async (
  context: CreateContext,
  request: AddRequest
): Promise<boolean> => {
  const { call, frameRef, runningRef, send, store } = context;
  const { extras, selections, toClaude } = request;
  const text = request.text.trim();

  if (!text || selections.length === 0) {
    return false;
  }

  const isNow = toClaude && !runningRef.current;
  const offset = toOffset(selections.length, extras);

  try {
    const created = await toCreatedList(
      selections,
      (selection) =>
        call<DesignComment>(
          "POST",
          "",
          toCreateBody({ extras, frameRef, isNow, offset, selection, text })
        ),
      []
    );

    store.setComments((prev) => {
      const createdIds = new Set(created.map((comment) => comment.id));

      return [
        ...prev.filter((comment) => !createdIds.has(comment.id)),
        ...created,
      ];
    });
    await send.deliver(created, toClaude);

    return true;
  } catch (error) {
    store.setNotice(errorText(error));

    return false;
  }
};

const postDrawing = async (
  context: CreateContext,
  input: DrawingInput
): Promise<boolean> => {
  const { call, frameRef, projectId, runningRef, send, store } = context;
  const text = input.text.trim();

  if (!text) {
    return false;
  }

  const isNow = input.toClaude && !runningRef.current;

  try {
    const attachment = await api.uploadAttachment(
      projectId,
      new File([input.image], "drawing.png", { type: "image/png" })
    );

    const comment = await call<DesignComment>(
      "POST",
      "",
      toDrawingBody({
        attachmentId: attachment.id,
        drawing: input.drawing,
        extras: input.extras ?? null,
        frameRef,
        isNow,
        text,
      })
    );

    if (!comment) {
      return false;
    }

    store.setComments((prev) => toMerged(prev, comment));
    await send.deliver([comment], input.toClaude);

    return true;
  } catch (error) {
    store.setNotice(errorText(error));

    return false;
  }
};

const useCommentCreates = (context: CreateContext): CommentCreates => {
  const add = useCallback(
    (
      selections: SelectionContext[],
      text: string,
      toClaude: boolean,
      extras: CommentExtras = {}
    ): Promise<boolean> =>
      postAdd(context, { extras, selections, text, toClaude }),
    [context]
  );

  const addDrawing = useCallback(
    (input: DrawingInput): Promise<boolean> => postDrawing(context, input),
    [context]
  );

  return { add, addDrawing };
};

export { useCommentCreates };

export type { CommentCreates, CreateContext };
