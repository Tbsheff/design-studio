import { useCallback, useState } from "react";
import type {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  ReactElement,
} from "react";

import { copy } from "./copy.js";

const PermissionDenyForm = ({
  isDisabled,
  onDeny,
  onCancel,
}: {
  isDisabled: boolean;
  onDeny: (note: string) => void;
  onCancel: () => void;
}): ReactElement => {
  const [note, setNote] = useState("");

  const onSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      onDeny(note.trim());
    },
    [note, onDeny]
  );

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setNote(event.target.value),
    []
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    },
    [onCancel]
  );

  return (
    <form className="permission-deny" onSubmit={onSubmit}>
      <input
        className="input small"
        name="note"
        aria-label={copy.noteForThe}
        placeholder={copy.tellTheAgent}
        value={note}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
      <button type="submit" className="btn small danger" disabled={isDisabled}>
        {copy.deny}
      </button>
    </form>
  );
};

export { PermissionDenyForm };
