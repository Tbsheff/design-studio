import { useCallback, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import type { PinSpot } from "./share-viewer-model.js";
import type { ShareComments } from "./use-share-comments.js";

interface CommentFormInput {
  readonly comments: ShareComments;
  readonly draft: PinSpot | null;
  readonly selected: number;
  readonly onClearDraft: () => void;
}

interface CommentForm {
  readonly isEmpty: boolean;
  readonly name: string;
  readonly text: string;
  readonly onName: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onText: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}

const useCommentForm = ({
  comments,
  draft,
  onClearDraft,
  selected,
}: CommentFormInput): CommentForm => {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const { send } = comments;

  const onName = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setName(event.currentTarget.value);
  }, []);

  const onText = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      setText(event.currentTarget.value);
    },
    []
  );

  const onSent = useCallback((): void => {
    setText("");
    onClearDraft();
  }, [onClearDraft]);

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      send(
        {
          frame: draft?.frame ?? selected,
          name: name.trim(),
          text: text.trim(),
          x: draft?.x ?? null,
          y: draft?.y ?? null,
        },
        onSent
      );
    },
    [draft, name, onSent, selected, send, text]
  );

  const isEmpty = name.trim() === "" || text.trim() === "";

  return { isEmpty, name, onName, onSubmit, onText, text };
};

export { useCommentForm };

export type { CommentForm };
