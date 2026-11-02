import { targetFromSelection } from "../../shared/comments.js";
import type {
  DesignComment,
  Direction,
  Project,
  SelectionContext,
} from "../../shared/contracts.js";
import { describeElement } from "../page-probe/element.js";
import { withPagePath } from "../project-source/source.js";
import type { CreateCommentInput } from "../store/comments.js";
import { NotFoundError } from "../store/errors.js";
import type { CommentRuntime } from "./comment-core.js";
import { frameTarget } from "./frame-target.js";

const DEFAULT_AUTHOR = "MCP client";

interface InsertRequest {
  readonly author: string | null;
  readonly directionId: string | null;
  readonly path: string | null;
  readonly projectId: string;
  readonly selector: string | null;
  readonly text: string;
}

interface InsertedComment {
  readonly author: string;
  readonly commentId: string;
  readonly frameLevel: boolean;
  readonly number: number;
}

const elementContext = async (
  runtime: CommentRuntime,
  target: { readonly direction: Direction; readonly project: Project },
  request: InsertRequest
): Promise<SelectionContext | null> => {
  if (request.selector === null) {
    return null;
  }

  const { preview } = runtime.prefill;

  const base = await preview.directionUrl(target.project, target.direction);

  const url = withPagePath(base, request.path ?? "");

  const context = await describeElement(preview, url, request.selector);

  if (context === null) {
    throw new NotFoundError(
      `No element matches ${request.selector} on the page.`
    );
  }

  return context;
};

const insertBody = (
  request: InsertRequest,
  context: SelectionContext | null,
  author: string
): CreateCommentInput => {
  const body: CreateCommentInput = {
    author,
    frame: { path: request.path ?? "" },
    status: "draft",
    target: frameTarget(),
    text: request.text,
  };

  if (context !== null) {
    body.target = targetFromSelection(context);
    body.context = context;
  }

  return body;
};

const insertComment = async (
  runtime: CommentRuntime,
  request: InsertRequest
): Promise<InsertedComment> => {
  const target = await runtime.loadTarget(
    request.projectId,
    request.directionId
  );

  const context = await elementContext(runtime, target, request);

  const author = request.author ?? DEFAULT_AUTHOR;

  const comment: DesignComment = await runtime.files.create(
    target.project.id,
    target.direction.id,
    insertBody(request, context, author)
  );

  return {
    author: comment.author ?? author,
    commentId: comment.id,
    frameLevel: context === null,
    number: comment.n,
  };
};

export { insertComment };

export type { InsertRequest, InsertedComment };
