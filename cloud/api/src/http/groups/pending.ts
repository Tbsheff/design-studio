import { Effect } from "effect";

import type { NotFound } from "../../../../../src/shared/actions/_core/errors/not-found.js";
import { NotImplemented } from "../../../../../src/shared/actions/_core/errors/not-implemented.js";
import type { Permission } from "../../../../../src/shared/actions/_core/permissions.js";

interface CommentRow {
  readonly id: string;
  readonly isResolved: boolean;
  readonly projectId: string;
  readonly text: string;
}

interface KeyRow {
  readonly actingUserId: string;
  readonly id: string;
  readonly name: string;
}

interface AgentRequestRow {
  readonly actionId: string;
  readonly id: string;
  readonly keyId: string;
  readonly needs: Permission;
  readonly status: "approved" | "denied" | "pending";
}

const MISSING_REPOS = [
  "tenant/repos/comments.ts",
  "tenant/repos/keys.ts",
  "tenant/repos/agent-requests.ts",
] as const;

const toPending = (repo: string): NotImplemented =>
  new NotImplemented({ message: `${repo} is not built yet.` });

const failPending = (repo: string): Effect.Effect<never, NotImplemented> =>
  Effect.fail(toPending(repo));

const listComments = (
  _projectId: string
): Effect.Effect<readonly CommentRow[], NotImplemented> =>
  failPending(MISSING_REPOS[0]);

const insertComment = (_input: {
  readonly projectId: string;
  readonly text: string;
}): Effect.Effect<CommentRow, NotImplemented> => failPending(MISSING_REPOS[0]);

const resolveComment = (
  _commentId: string
): Effect.Effect<CommentRow, NotFound | NotImplemented> =>
  failPending(MISSING_REPOS[0]);

const removeComment = (
  _commentId: string
): Effect.Effect<void, NotFound | NotImplemented> =>
  failPending(MISSING_REPOS[0]);

const listKeys = (): Effect.Effect<readonly KeyRow[], NotImplemented> =>
  failPending(MISSING_REPOS[1]);

const removeKey = (
  _keyId: string
): Effect.Effect<void, NotFound | NotImplemented> =>
  failPending(MISSING_REPOS[1]);

const readAgentRequest = (
  _requestId: string
): Effect.Effect<AgentRequestRow, NotFound | NotImplemented> =>
  failPending(MISSING_REPOS[2]);

const settleAgentRequest = (_input: {
  readonly decision: "approve" | "deny";
  readonly requestId: string;
  readonly userId: string;
}): Effect.Effect<AgentRequestRow, NotFound | NotImplemented> =>
  failPending(MISSING_REPOS[2]);

export {
  MISSING_REPOS,
  insertComment,
  listComments,
  listKeys,
  readAgentRequest,
  removeComment,
  removeKey,
  resolveComment,
  settleAgentRequest,
};

export type { AgentRequestRow, CommentRow, KeyRow };
