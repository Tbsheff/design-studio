import { Context, Effect, Layer } from "effect";

import type { MentionFiles } from "../../shared/actions/comments/schema.js";
import { filterComments } from "../../shared/comments.js";
import type { CommentFilter } from "../../shared/comments.js";
import { attemptComments } from "./comment-core.js";
import type { CommentError, CommentRuntime } from "./comment-core.js";
import { toCommentPage } from "./comment-page.js";
import type { CommentPage } from "./comment-page.js";
import { canvasFrameOf } from "./frame.js";
import { listWorkTree } from "./work-tree.js";

interface ListRequest {
  readonly cursor: string | null;
  readonly directionId: string | null;
  readonly frame: string | null;
  readonly limit: number;
  readonly projectId: string;
  readonly status: CommentFilter | null;
}

interface MentionRequest {
  readonly directionId: string;
  readonly limit: number;
  readonly projectId: string;
  readonly query: string | null;
}

interface CommentStoreApi {
  readonly list: (
    request: ListRequest
  ) => Effect.Effect<CommentPage, CommentError>;
  readonly searchMention: (
    request: MentionRequest
  ) => Effect.Effect<MentionFiles, CommentError>;
}

const readList = async (
  runtime: CommentRuntime,
  request: ListRequest
): Promise<CommentPage> => {
  const { direction, project } = await runtime.loadTarget(
    request.projectId,
    request.directionId
  );

  const frame = request.frame ?? "";

  const [canvasFrame, all] = await Promise.all([
    canvasFrameOf(project, runtime.projectDir, frame),
    runtime.files.list(project.id, direction.id),
  ]);

  const chosen = filterComments(
    all,
    request.status ?? "open",
    frame,
    canvasFrame
  );

  return toCommentPage(chosen, request.cursor, request.limit);
};

const matchesQuery = (file: string, query: string | null): boolean => {
  if (query === null || query.trim() === "") {
    return true;
  }

  return file.toLowerCase().includes(query.trim().toLowerCase());
};

const readMentionFiles = async (
  runtime: CommentRuntime,
  request: MentionRequest
): Promise<MentionFiles> => {
  const { direction } = await runtime.loadTarget(
    request.projectId,
    request.directionId
  );

  const all = await listWorkTree(direction.workTree);

  const found = all.filter((file) => matchesQuery(file, request.query));

  return {
    files: found.slice(0, request.limit),
    truncated: found.length > request.limit,
  };
};

class CommentStore extends Context.Service<CommentStore, CommentStoreApi>()(
  "design-studio/comments/CommentStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    CommentStore,
    CommentStore.of({
      list: Effect.fn("CommentStore.list")(function* run(request: ListRequest) {
        return yield* attemptComments((runtime) => readList(runtime, request));
      }),
      searchMention: Effect.fn("CommentStore.searchMention")(function* run(
        request: MentionRequest
      ) {
        return yield* attemptComments((runtime) =>
          readMentionFiles(runtime, request)
        );
      }),
    })
  );
}

export { CommentStore };

export type { CommentStoreApi, ListRequest, MentionRequest };
