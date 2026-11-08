import { Icon, useModalDialog } from "@design-studio/ui";
import { useState, useTransition } from "react";

import { errorText } from "../../api.js";
import { uiStore } from "../../platform/storage.js";
import type { LibraryFrom } from "../../platform/storage.js";
import { COPY } from "./copy.js";
import { PackList } from "./pack-list.js";
import { pickable, usePacks } from "./packs.js";

interface ChangeProps {
  currentId: string | null;
  from: LibraryFrom | null;
  onClose: () => void;
  onApply: (packId: string) => Promise<void>;
}

export const ChangePackDialog = ({
  currentId,
  from,
  onClose,
  onApply,
}: ChangeProps) => {
  const state = pickable(usePacks());
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dialog = useModalDialog(() => (busy ? false : onClose()));
  const title = currentId ? "Change design system" : "Add design system";

  const choose = (packId: string | undefined) => {
    if (!packId || busy) {
      return;
    }

    if (packId === currentId) {
      return onClose();
    }

    setError(null);
    startTransition(async () => {
      try {
        await onApply(packId);
        onClose();
      } catch (err) {
        setError(errorText(err));
      }
    });
  };

  return (
    <dialog
      ref={dialog.ref}
      className="modal wide"
      aria-label={title}
      onMouseDown={dialog.onMouseDown}
    >
      <div className="modal-head">
        <div className="titles">
          <h2>{title}</h2>
          <p>
            Writes new tokens, tokens.css and DESIGN.md as one version. Your
            project notes stay.
          </p>
        </div>
        <button
          className="icon-btn"
          aria-label={`Close ${title}`}
          onClick={onClose}
          disabled={busy}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="modal-body ds-switch-body" aria-busy={busy}>
        {state.error && (
          <div className="alert error small">
            Could not load design systems. {state.error}
          </div>
        )}
        {error && (
          <div className="alert error small" role="alert">
            {error}
          </div>
        )}
        <PackList
          packs={state.packs}
          value={currentId}
          includeNone={false}
          onChoose={(pack) => void choose(pack?.id)}
        />
      </div>
      <div className="modal-foot">
        <button
          type="button"
          className="btn ghost"
          disabled={busy}
          onClick={() =>
            uiStore.set({
              activeProjectId: null,
              libraryFrom: from,
              screen: "design-systems",
            })
          }
        >
          Manage…
        </button>
        <button
          type="button"
          className="btn ghost has-icon"
          disabled={busy}
          onClick={() =>
            uiStore.set({ activeProjectId: null, screen: "new-design-system" })
          }
        >
          <Icon name="plus" size={14} />
          New design system…
        </button>
      </div>
    </dialog>
  );
};

interface SaveProps {
  defaultName: string;
  updating: boolean;
  canCopy: boolean;
  onClose: () => void;
  onSave: (name: string, asNew: boolean) => Promise<void>;
}

const COPY_SUFFIX = " copy";

export const SavePackDialog = ({
  defaultName,
  updating,
  canCopy,
  onClose,
  onSave,
}: SaveProps) => {
  const [name, setName] = useState(defaultName);
  const [asNew, setAsNew] = useState(false);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dialog = useModalDialog(() => (busy ? false : onClose()));

  const submit = () => {
    if (!name.trim() || busy) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await onSave(name.trim(), asNew);
        onClose();
      } catch (err) {
        setError(errorText(err));
      }
    });
  };

  return (
    <dialog
      ref={dialog.ref}
      className="modal"
      aria-label={COPY.labelSaveToLibrary}
      onMouseDown={dialog.onMouseDown}
    >
      <form
        className="modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="modal-head">
          <div className="titles">
            <h2>Save to library</h2>
            <p>
              {asNew
                ? "Saves a new design system. This project then uses the new one."
                : updating
                  ? `Updates ${defaultName} in your library with this direction's tokens and DESIGN.md.`
                  : "Saves this direction's tokens and DESIGN.md as a design system you can use in other projects."}
            </p>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label={COPY.labelCloseSaveToLibrary}
            onClick={onClose}
            disabled={busy}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body">
          {canCopy && (
            <fieldset className="save-choice">
              <legend className="sr-only">Save as</legend>
              <label>
                <input
                  type="radio"
                  name="save-as"
                  checked={!asNew}
                  onChange={() => {
                    setAsNew(false);
                    setName(defaultName);
                  }}
                />
                Update {defaultName}
              </label>
              <label>
                <input
                  type="radio"
                  name="save-as"
                  checked={asNew}
                  onChange={() => {
                    setAsNew(true);
                    setName(
                      `${defaultName.slice(0, 80 - COPY_SUFFIX.length)}${COPY_SUFFIX}`
                    );
                  }}
                />
                Save as a new design system
              </label>
            </fieldset>
          )}
          <label className="field">
            <span>Name</span>
            <input
              data-autofocus
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              aria-label={COPY.labelDesignSystemName}
            />
          </label>
          {error && (
            <div className="alert error small" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button
            type="button"
            className="btn ghost"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn primary"
            disabled={busy || !name.trim()}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </dialog>
  );
};
