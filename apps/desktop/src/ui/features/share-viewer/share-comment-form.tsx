import {
  SHARE_COMMENT_MAX,
  SHARE_NAME_MAX,
} from "@design-studio/contracts/share";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { PinSpot } from "./share-viewer-model.js";
import { useCommentForm } from "./use-comment-form.js";
import type { ShareComments } from "./use-share-comments.js";

interface ShareCommentFormProps {
  readonly comments: ShareComments;
  readonly draft: PinSpot | null;
  readonly frameName: string;
  readonly selected: number;
  readonly onClearDraft: () => void;
}

const toWhereText = (draft: PinSpot | null, frameName: string): string => {
  if (draft === null) {
    return copy.general;
  }

  return `${copy.pinnedOn} ${frameName}`;
};

const toSendText = (isPending: boolean): string => {
  if (isPending) {
    return copy.sending;
  }

  return copy.send;
};

const ShareCommentForm = ({
  comments,
  draft,
  frameName,
  onClearDraft,
  selected,
}: ShareCommentFormProps): ReactElement => {
  const { isEmpty, name, onName, onSubmit, onText, text } = useCommentForm({
    comments,
    draft,
    onClearDraft,
    selected,
  });

  const { error, isPending } = comments;

  return (
    <form className="share-comment-form" onSubmit={onSubmit}>
      <p className="share-comment-where">{toWhereText(draft, frameName)}</p>
      <label className="share-field">
        <span>{copy.nameLabel}</span>
        <input
          name="name"
          value={name}
          maxLength={SHARE_NAME_MAX}
          placeholder={copy.namePlaceholder}
          autoComplete="name"
          onChange={onName}
        />
      </label>
      <label className="share-field">
        <span>{copy.commentLabel}</span>
        <textarea
          name="comment"
          value={text}
          maxLength={SHARE_COMMENT_MAX}
          placeholder={copy.commentPlaceholder}
          onChange={onText}
        />
      </label>
      {error && <p className="share-comment-error">{error}</p>}
      <div className="share-comment-actions">
        {draft && (
          <button type="button" className="btn ghost" onClick={onClearDraft}>
            {copy.cancel}
          </button>
        )}
        <button
          type="submit"
          className="btn primary"
          disabled={isEmpty || isPending}
        >
          {toSendText(isPending)}
        </button>
      </div>
    </form>
  );
};

export { ShareCommentForm };
