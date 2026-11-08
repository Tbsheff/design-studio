import type { PackSummary } from "@design-studio/contracts";
import { Icon, useModalDialog } from "@design-studio/ui";
import type { FormEvent, ReactElement } from "react";
import { useState, useTransition } from "react";

import { errorText } from "../../api.js";
import { COPY } from "./copy.js";

const useBusyAction = (onClose: () => void) => {
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (task: () => Promise<void>): void => {
    if (busy) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await task();
        onClose();
      } catch (err) {
        setError(errorText(err));
      }
    });
  };

  return { busy, error, run };
};

const Head = ({
  title,
  text,
  busy,
  onClose,
}: {
  title: string;
  text: string;
  busy: boolean;
  onClose: () => void;
}): ReactElement => (
  <div className="modal-head">
    <div className="titles">
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
    <button
      type="button"
      className="icon-btn"
      aria-label={`Close ${title}`}
      onClick={onClose}
      disabled={busy}
    >
      <Icon name="close" />
    </button>
  </div>
);

const ErrorLine = ({
  error,
}: {
  error: string | null;
}): ReactElement | null => {
  if (!error) {
    return null;
  }

  return (
    <div className="alert error small" role="alert">
      {error}
    </div>
  );
};

const RenamePackDialog = ({
  pack,
  onClose,
  onRename,
}: {
  pack: PackSummary;
  onClose: () => void;
  onRename: (name: string) => Promise<void>;
}): ReactElement => {
  const [name, setName] = useState(pack.name);
  const action = useBusyAction(onClose);
  const dialog = useModalDialog(() => (action.busy ? false : onClose()));

  const submit = (event: FormEvent): void => {
    event.preventDefault();

    if (name.trim() && name.trim() !== pack.name) {
      void action.run(() => onRename(name.trim()));
    }
  };

  const errorLineNode = <ErrorLine error={action.error} />;

  const btnNode = (
    <button
      type="button"
      className="btn ghost"
      onClick={onClose}
      disabled={action.busy}
    >
      {COPY.textCancel}
    </button>
  );

  const btnNode2 = (
    <button
      type="submit"
      className="btn primary"
      disabled={action.busy || !name.trim() || name.trim() === pack.name}
    >
      {action.busy && "Renaming…"}
      {!action.busy && "Rename"}
    </button>
  );

  return (
    <dialog
      ref={dialog.ref}
      className="modal"
      aria-label={COPY.labelRenameDesignSystem}
      onMouseDown={dialog.onMouseDown}
    >
      <form className="modal-form" onSubmit={submit}>
        <Head
          title={COPY.titleRenameDesignSystem}
          text="Projects that use it keep working. Its id does not change."
          busy={action.busy}
          onClose={onClose}
        />
        <div className="modal-body">
          <label className="field">
            <span>{COPY.textName}</span>
            <input
              data-autofocus
              value={name}
              maxLength={80}
              onChange={(evt) => setName(evt.target.value)}
              aria-label={COPY.labelDesignSystemName}
            />
          </label>
          {errorLineNode}
        </div>
        <div className="modal-foot">
          {btnNode}
          {btnNode2}
        </div>
      </form>
    </dialog>
  );
};

const DeletePackDialog = ({
  pack,
  onClose,
  onDelete,
}: {
  pack: PackSummary;
  onClose: () => void;
  onDelete: () => Promise<void>;
}): ReactElement => {
  const action = useBusyAction(onClose);
  const dialog = useModalDialog(() => (action.busy ? false : onClose()));

  return (
    <dialog
      ref={dialog.ref}
      className="modal"
      aria-label={COPY.labelDeleteDesignSystem}
      onMouseDown={dialog.onMouseDown}
    >
      <Head
        title={`Delete ${pack.name}?`}
        text="It leaves your library. Projects that use it keep their files."
        busy={action.busy}
        onClose={onClose}
      />
      <div className="modal-body">
        <ErrorLine error={action.error} />
      </div>
      <div className="modal-foot">
        <button
          type="button"
          className="btn ghost"
          data-autofocus
          onClick={onClose}
          disabled={action.busy}
        >
          {COPY.textCancel}
        </button>
        <button
          type="button"
          className="btn danger"
          onClick={() => void action.run(onDelete)}
          disabled={action.busy}
        >
          {action.busy && "Deleting…"}
          {!action.busy && "Delete"}
        </button>
      </div>
    </dialog>
  );
};

const ImportConflictDialog = ({
  existing,
  onClose,
  onChoose,
}: {
  existing: PackSummary;
  onClose: () => void;
  onChoose: (mode: "replace" | "copy") => Promise<void>;
}) => {
  const action = useBusyAction(onClose);
  const dialog = useModalDialog(() => (action.busy ? false : onClose()));

  return (
    <dialog
      ref={dialog.ref}
      className="modal"
      aria-label={COPY.labelDesignSystemAlreadyInYour}
      onMouseDown={dialog.onMouseDown}
    >
      <Head
        title={`${existing.name} is already in your library`}
        text="Replace it with the files in the zip, or keep both. Projects keep their own files."
        busy={action.busy}
        onClose={onClose}
      />
      <div className="modal-body">
        <ErrorLine error={action.error} />
      </div>
      <div className="modal-foot">
        <button
          type="button"
          className="btn ghost"
          onClick={onClose}
          disabled={action.busy}
        >
          {COPY.textCancel}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => void action.run(() => onChoose("copy"))}
          disabled={action.busy}
        >
          {COPY.textKeepBoth}
        </button>
        <button
          type="button"
          className="btn primary"
          data-autofocus
          onClick={() => void action.run(() => onChoose("replace"))}
          disabled={action.busy}
        >
          {COPY.textReplace}
        </button>
      </div>
    </dialog>
  );
};

export { RenamePackDialog, DeletePackDialog, ImportConflictDialog };
