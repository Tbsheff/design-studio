import { LIMITS } from "@design-studio/actions/publish-remote";
import type { RemoteComment } from "@design-studio/actions/publish-remote";

import { randomId } from "./crypto";
import type { PublicationRow } from "./db";
import { ApiError, clientKey } from "./http";
import type { Env } from "./http";
import { clientBucket, takeToken } from "./limits";

interface CommentTarget {
  readonly env: Env;
  readonly pub: PublicationRow;
  readonly request: Request;
}

interface CommentRow {
  readonly author: string;
  readonly body: string;
  readonly created_at: number;
  readonly id: string;
}

const COMMENTS_LISTED = 100;

const COMMENT_ID_LENGTH = 9;

const TAB_CODE = 9;

const LINE_FEED_CODE = 10;

const LAST_CONTROL_CODE = 31;

const DELETE_CODE = 127;

const isControl = (character: string): boolean => {
  const code = character.codePointAt(0) ?? 0;

  if (code === TAB_CODE || code === LINE_FEED_CODE) {
    return false;
  }

  return code <= LAST_CONTROL_CODE || code === DELETE_CODE;
};

const toControlFree = (raw: string): string => {
  const parts: string[] = [];
  let wasControl = false;

  for (const character of raw) {
    const isControlNow = isControl(character);

    if (!isControlNow) {
      parts.push(character);
    }

    if (isControlNow && !wasControl) {
      parts.push(" ");
    }

    wasControl = isControlNow;
  }

  return parts.join("");
};

const RATE_WINDOW_MS = 600_000;

const toComment = (row: CommentRow): RemoteComment => ({
  author: row.author,
  body: row.body,
  createdAt: row.created_at,
  id: row.id,
});

const listComments = async (
  db: D1Database,
  publicationId: string
): Promise<RemoteComment[]> => {
  const rows = await db
    .prepare(
      "SELECT id, author, body, created_at FROM comments WHERE publication_id = ?1 ORDER BY created_at DESC LIMIT ?2"
    )
    .bind(publicationId, COMMENTS_LISTED)
    .all<CommentRow>();

  return rows.results.map((row) => toComment(row));
};

const toCleanText = (raw: string, max: number): string | null => {
  const value = toControlFree(raw).trim();

  if (value.length === 0 || value.length > max) {
    return null;
  }

  return value;
};

const toLimitError = async (target: CommentTarget): Promise<string | null> => {
  try {
    await takeToken(
      target.env.DB,
      await clientBucket(
        `comment:${target.pub.id}`,
        clientKey(target.request),
        target.env.PUBLISH_KEY_HASH
      ),
      LIMITS.commentsPer10Min,
      RATE_WINDOW_MS,
      "You sent many comments. Wait 10 minutes."
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return error.message;
    }

    throw error;
  }

  return null;
};

const createComment = async (
  target: CommentTarget,
  rawAuthor: string,
  rawBody: string
): Promise<string | null> => {
  const author = toCleanText(rawAuthor, LIMITS.commentAuthorMax);
  const body = toCleanText(rawBody, LIMITS.commentBodyMax);

  if (author === null || body === null) {
    return `Type a name (1 to ${LIMITS.commentAuthorMax} characters) and a comment (1 to ${LIMITS.commentBodyMax} characters).`;
  }

  const limited = await toLimitError(target);

  if (limited !== null) {
    return limited;
  }

  await target.env.DB.prepare(
    "INSERT INTO comments (id, publication_id, author, body, created_at) VALUES (?1, ?2, ?3, ?4, ?5)"
  )
    .bind(randomId(COMMENT_ID_LENGTH), target.pub.id, author, body, Date.now())
    .run();

  return null;
};

export { createComment, listComments };

export type { CommentTarget };
