import type { RemoteComment } from "@design-studio/actions/publish-remote";

import { createComment, listComments } from "./comments";
import {
  isObject,
  STATUS_BAD,
  STATUS_FORBIDDEN,
  STATUS_OK,
  STATUS_TOO_LARGE,
  toJson,
  toNotAllowed,
} from "./play-reply";
import type { PlayContext } from "./play-reply";

interface CommentDraft {
  readonly name: string;
  readonly text: string;
}

type PlayComment = Readonly<Record<string, string | number | null>>;

const NUMBER_KEY = "n";

const COMMENT_BODY_MAX = 16_384;

const COMMENTS_OFF = "Comments are off for this design.";

const TOO_LARGE = "The comment is too large.";

const toErrorText = (error: string): string => JSON.stringify({ error });

const toPlayComment = (comment: RemoteComment, index: number): PlayComment =>
  Object.fromEntries([
    ["author", comment.author],
    ["createdAt", comment.createdAt],
    ["frame", 0],
    [NUMBER_KEY, index + 1],
    ["text", comment.body],
    ["x", null],
    ["y", null],
  ]);

const toPlayComments = async (context: PlayContext): Promise<PlayComment[]> => {
  if (context.pub.comments_enabled !== 1) {
    return [];
  }

  const list = await listComments(context.env.DB, context.pub.id);

  return list
    .toReversed()
    .map((comment, index) => toPlayComment(comment, index));
};

const EMPTY_DRAFT: CommentDraft = { name: "", text: "" };

const toDraft = async (request: Request): Promise<CommentDraft> => {
  try {
    const body: unknown = await request.json();

    if (!isObject(body)) {
      return EMPTY_DRAFT;
    }

    const fields = new Map(Object.entries(body));

    return {
      name: String(fields.get("name") ?? ""),
      text: String(fields.get("text") ?? ""),
    };
  } catch {
    return EMPTY_DRAFT;
  }
};

const postComment = async (context: PlayContext): Promise<Response> => {
  if (context.pub.comments_enabled !== 1) {
    return toJson(context, toErrorText(COMMENTS_OFF), STATUS_FORBIDDEN);
  }

  const length = Number(context.request.headers.get("content-length") ?? "0");

  if (length > COMMENT_BODY_MAX) {
    return toJson(context, toErrorText(TOO_LARGE), STATUS_TOO_LARGE);
  }

  const draft = await toDraft(context.request);

  const error = await createComment(context, draft.name, draft.text);

  if (error !== null) {
    return toJson(context, toErrorText(error), STATUS_BAD);
  }

  const list = await toPlayComments(context);

  return toJson(
    context,
    JSON.stringify({ comment: list.at(-1) ?? null }),
    STATUS_OK
  );
};

const serveComments = async (context: PlayContext): Promise<Response> => {
  const { method } = context.request;

  if (method === "POST") {
    return postComment(context);
  }

  if (method !== "GET") {
    return toNotAllowed(context, "GET, POST");
  }

  const comments = await toPlayComments(context);

  return toJson(context, JSON.stringify({ comments }), STATUS_OK);
};

export { serveComments };
