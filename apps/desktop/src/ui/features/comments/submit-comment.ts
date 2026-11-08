import { markAdded } from "./comment-added-store.js";
import type { ComposerSubmit } from "./comment-composer-model.js";
import { withMentions } from "./comment-layer-model.js";
import type { CommentTools } from "./comment-layer-types.js";
import { breadcrumbOf, scopeText } from "./comment-placement.js";
import type { PinOffset } from "./comment-placement.js";
import type { CommentExtras } from "./comments-control.js";
import type { SelectionContext } from "./deps.js";
import type { CommentsControl } from "./use-comments.js";

interface SubmitContext {
  readonly control: CommentsControl;
  readonly tools: CommentTools;
}

interface SubmitRequest {
  readonly finish: () => void;
  readonly offset?: PinOffset;
  readonly selections: SelectionContext[];
}

const isSteering = (
  control: CommentsControl,
  tools: CommentTools,
  input: ComposerSubmit
): boolean => {
  if (!input.toClaude || !input.now || !control.running) {
    return false;
  }

  return input.attachmentIds.length === 0 && Boolean(tools.onSteer);
};

const submitComment = async (
  context: SubmitContext,
  request: SubmitRequest,
  input: ComposerSubmit
): Promise<boolean> => {
  const { control, tools } = context;
  const { finish, offset, selections } = request;
  const { onSteer } = tools;

  if (onSteer && isSteering(control, tools, input)) {
    const crumb = breadcrumbOf(tools.pageName, selections);
    onSteer(
      scopeText(crumb, selections, withMentions(input.text, input.mentions))
    );
    finish();

    return true;
  }

  const extras: CommentExtras = {
    attachmentIds: input.attachmentIds,
    mentions: input.mentions,
  };

  if (offset) {
    extras.offset = offset;
  }

  const isOk = await control.add(
    selections,
    input.text,
    input.toClaude,
    extras
  );

  if (isOk) {
    markAdded();
    finish();
  }

  return isOk;
};

export { submitComment };

export type { SubmitContext, SubmitRequest };
