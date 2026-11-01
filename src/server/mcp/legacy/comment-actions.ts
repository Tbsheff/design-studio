import { targetFromSelection } from "../../../shared/comments.js";
import type {
  DesignComment,
  SelectionContext,
} from "../../../shared/contracts.js";
import { EditError, loadTarget, studioCall } from "../edit-deps.js";
import type { EditDeps } from "../edit-deps.js";
import { base, ok, pageUrl } from "../edit-kit.js";
import type { Done } from "../edit-kit.js";
import { describeElement } from "../element.js";
import type {
  AddCommentInput,
  ReplyCommentInput,
  ResolveCommentInput,
} from "./comments-schema.js";
import { frameTarget } from "./frame-target.js";

interface CommentBody {
  author: string;
  context?: SelectionContext;
  frame: { path: string };
  status: "draft";
  target: DesignComment["target"];
  text: string;
}

const commentContext = async (
  deps: EditDeps,
  input: AddCommentInput,
  target: Awaited<ReturnType<typeof loadTarget>>
): Promise<SelectionContext | null> => {
  if (!input.selector) {
    return null;
  }

  const url = await pageUrl(deps, target.project, target.direction, input.path);

  const context = await describeElement(deps.preview, url, input.selector);

  if (!context) {
    throw new EditError(`No element matches ${input.selector} on the page.`);
  }

  return context;
};

const commentBody = (
  input: AddCommentInput,
  context: SelectionContext | null,
  client: string
): CommentBody => {
  const body: CommentBody = {
    author: client,
    frame: { path: input.path ?? "" },
    status: "draft",
    target: frameTarget(),
    text: input.text,
  };

  if (context) {
    body.target = targetFromSelection(context);
    body.context = context;
  }

  return body;
};

const onText = (context: SelectionContext | null): string => {
  if (context) {
    return ` on ${context.tag}`;
  }

  return "";
};

const addComment = async (
  deps: EditDeps,
  input: AddCommentInput,
  client: string
): Promise<Done> => {
  const target = await loadTarget(deps, input.projectId, input.directionId);

  const { project, direction } = target;

  const context = await commentContext(deps, input, target);

  const comment = await studioCall<DesignComment>(
    deps,
    "POST",
    `${base(project, direction.id)}/comments`,
    commentBody(input, context, client)
  );

  return {
    activity: {
      directionId: direction.id,
      projectId: project.id,
      summary: `Added comment #${comment.n}${onText(context)}`,
    },
    result: ok({
      author: comment.author ?? client,
      commentId: comment.id,
      frameLevel: !context,
      number: comment.n,
    }),
  };
};

const replyComment = async (
  deps: EditDeps,
  input: ReplyCommentInput,
  client: string
): Promise<Done> => {
  const { project, direction } = await loadTarget(
    deps,
    input.projectId,
    input.directionId
  );

  const comment = await studioCall<DesignComment>(
    deps,
    "POST",
    `${base(project, direction.id)}/comments/${encodeURIComponent(input.commentId)}/replies`,
    { author: client, text: input.text }
  );

  return {
    activity: {
      directionId: direction.id,
      projectId: project.id,
      summary: `Replied to comment #${comment.n}`,
    },
    result: ok({
      commentId: comment.id,
      replies: comment.replies?.length ?? 0,
    }),
  };
};

const resolveComment = async (
  deps: EditDeps,
  input: ResolveCommentInput
): Promise<Done> => {
  const { project, direction } = await loadTarget(
    deps,
    input.projectId,
    input.directionId
  );

  const comment = await studioCall<DesignComment>(
    deps,
    "PATCH",
    `${base(project, direction.id)}/comments/${encodeURIComponent(input.commentId)}`,
    { status: "resolved" }
  );

  return {
    activity: {
      directionId: direction.id,
      projectId: project.id,
      summary: `Resolved comment #${comment.n}`,
    },
    result: ok({ commentId: comment.id, status: comment.status }),
  };
};

export { addComment, replyComment, resolveComment };
