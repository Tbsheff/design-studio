import { SHARE_FRAME_HASH_KEY } from "@design-studio/contracts/share";
import { SHARE_PLAY_DATA_PATH } from "@design-studio/contracts/share-play";
import type {
  ShareCommentDraft,
  SharePlayData,
  ShareViewerComment,
} from "@design-studio/contracts/share-play";

interface CommentReply {
  readonly comment: ShareViewerComment | null;
  readonly error: string | null;
}

interface CommentListBody {
  readonly comments: readonly ShareViewerComment[];
}

interface CommentBody {
  readonly comment: ShareViewerComment;
}

interface ErrorBody {
  readonly error: string;
}

const COMMENTS_PATH = "/comments";

const SEND_FAILED = "Could not send the comment. Try again.";

const toShareBase = (): string => {
  const path = globalThis.location.pathname;
  let end = path.length;

  while (end > 0 && path[end - 1] === "/") {
    end -= 1;
  }

  return path.slice(0, end);
};

const readShareFrameKey = (): string | null => {
  const hash = globalThis.location.hash.replace(/^#/u, "");

  return new URLSearchParams(hash).get(SHARE_FRAME_HASH_KEY);
};

const isObject = (value: unknown): value is object =>
  value instanceof Object && !Array.isArray(value);

const isPlayData = (value: unknown): value is SharePlayData => {
  if (!isObject(value)) {
    return false;
  }

  const fields = new Map(Object.entries(value));

  const hasLists =
    Array.isArray(fields.get("frames")) &&
    Array.isArray(fields.get("implicit"));

  return hasLists && isObject(fields.get("links"));
};

const isViewerComment = (value: unknown): value is ShareViewerComment => {
  if (!isObject(value)) {
    return false;
  }

  const fields = new Map(Object.entries(value));

  return (
    Number.isInteger(fields.get("n")) && Number.isInteger(fields.get("frame"))
  );
};

const isCommentListBody = (value: unknown): value is CommentListBody => {
  if (!isObject(value)) {
    return false;
  }

  const list = new Map(Object.entries(value)).get("comments");

  return Array.isArray(list) && list.every((item) => isViewerComment(item));
};

const isCommentBody = (value: unknown): value is CommentBody =>
  isObject(value) &&
  isViewerComment(new Map(Object.entries(value)).get("comment"));

const isErrorBody = (value: unknown): value is ErrorBody =>
  isObject(value) && Boolean(new Map(Object.entries(value)).get("error"));

const getSharePlay = async (): Promise<SharePlayData | null> => {
  const response = await fetch(`${toShareBase()}${SHARE_PLAY_DATA_PATH}`, {
    cache: "no-store",
    credentials: "omit",
  });

  if (!response.ok) {
    return null;
  }

  const body: unknown = await response.json();

  if (isPlayData(body)) {
    return body;
  }

  return null;
};

const listShareComments = async (): Promise<readonly ShareViewerComment[]> => {
  const response = await fetch(`${toShareBase()}${COMMENTS_PATH}`, {
    cache: "no-store",
    credentials: "omit",
  });

  if (!response.ok) {
    return [];
  }

  const body: unknown = await response.json();

  if (isCommentListBody(body)) {
    return body.comments;
  }

  return [];
};

const createShareComment = async (
  draft: ShareCommentDraft
): Promise<CommentReply> => {
  const response = await fetch(`${toShareBase()}${COMMENTS_PATH}`, {
    body: JSON.stringify(draft),
    credentials: "omit",
    headers: { "content-type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    const failed: unknown = await response.json();

    if (isErrorBody(failed)) {
      return { comment: null, error: failed.error };
    }

    return { comment: null, error: SEND_FAILED };
  }

  const made: unknown = await response.json();

  if (isCommentBody(made)) {
    return { comment: made.comment, error: null };
  }

  return { comment: null, error: SEND_FAILED };
};

export {
  createShareComment,
  getSharePlay,
  listShareComments,
  readShareFrameKey,
};

export type { CommentReply };
