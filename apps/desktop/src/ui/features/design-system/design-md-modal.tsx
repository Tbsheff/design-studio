import { Icon, useModalDialog } from "@design-studio/ui";
import type { ReactElement } from "react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { Markdown } from "../../ai/components/ai/markdown.js";
import { api, errorText } from "../../api.js";
import { MOD_LABEL } from "../comments/comment-popover.js";
import { COPY } from "./copy.js";
import { outlineOf } from "./design-md-outline.js";
import type { OutlineItem } from "./design-md-outline.js";

const HEADING_TAGS = new Set(["H1", "H2", "H3"]);

const collectHeadings = (
  root: Element,
  found: HTMLElement[]
): HTMLElement[] => {
  for (const child of root.children) {
    if (HEADING_TAGS.has(child.tagName) && child instanceof HTMLElement) {
      found.push(child);
    }

    collectHeadings(child, found);
  }

  return found;
};

const jumpTo = (
  editor: HTMLTextAreaElement | null,
  preview: HTMLDivElement | null,
  item: OutlineItem,
  index: number
): void => {
  if (editor) {
    editor.focus();
    editor.setSelectionRange(item.offset, item.offset);

    const lineHeight = Number(getComputedStyle(editor).lineHeight) || 20;

    editor.scrollTop = Math.max(0, item.line * lineHeight - lineHeight);
  }

  const heading = preview ? collectHeadings(preview, [])[index] : null;

  if (heading instanceof HTMLElement && preview) {
    preview.scrollTop = heading.offsetTop - preview.offsetTop - 8;
  }
};

const Outline = ({
  items,
  onJump,
}: {
  items: OutlineItem[];
  onJump: (item: OutlineItem, index: number) => void;
}): ReactElement => (
  <nav className="dmd-outline" aria-label={COPY.labelOutline}>
    <p className="dmd-pane-label">Outline</p>
    {items.length === 0 ? (
      <p className="dmd-outline-empty">
        Add a heading, like ## Color, to see it here.
      </p>
    ) : (
      <ul>
        {items.map((item, index) => (
          <li key={`${item.line}:${item.text}`}>
            <button
              type="button"
              className={`dmd-outline-item level-${item.level}`}
              onClick={() => onJump(item, index)}
            >
              <span className="truncate">{item.text}</span>
            </button>
          </li>
        ))}
      </ul>
    )}
  </nav>
);

const UnsavedBar = ({
  saving,
  onSave,
  onDiscard,
  onKeep,
}: {
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onKeep: () => void;
}): ReactElement => {
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => keep.current?.focus(), []);

  return (
    <div
      className="modal-foot dmd-unsaved"
      role="alertdialog"
      aria-label={COPY.labelUnsavedChanges}
      aria-describedby="dmd-unsaved-text"
    >
      <span id="dmd-unsaved-text" className="dmd-unsaved-text">
        <Icon name="alert" size={14} />
        Save your changes to DESIGN.md?
      </span>
      <button className="btn ghost" onClick={onDiscard} disabled={saving}>
        Discard
      </button>
      <button
        ref={keep}
        className="btn ghost"
        onClick={onKeep}
        disabled={saving}
      >
        Keep editing
      </button>
      <button className="btn primary" onClick={onSave} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
};

const DesignMdModal = ({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}): ReactElement => {
  const [content, setContent] = useState<string | null>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;

    const read = async (): Promise<void> => {
      try {
        const result = await api.getDesignMd(projectId);

        if (live) {
          setContent(result.content);
          setOriginal(result.content);
        }
      } catch (err) {
        if (live) {
          setContent("");
          setError(
            `Could not load DESIGN.md. ${errorText(err)} Close this window and open it again.`
          );
        }
      }
    };

    void read();

    return (): void => {
      live = false;
    };
  }, [projectId]);

  const dirty = content !== null && original !== null && content !== original;
  const state = useRef({ asking, dirty });
  state.current = { asking, dirty };

  const requestClose = (): false | undefined => {
    if (state.current.asking) {
      setAsking(false);

      return false;
    }

    if (!state.current.dirty) {
      onClose();

      return;
    }

    setAsking(true);

    return false;
  };

  const dialog = useModalDialog(requestClose);
  const editor = useRef<HTMLTextAreaElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const loaded = content !== null;
  const shown = useDeferredValue(content ?? "");
  const outline = useMemo(() => outlineOf(shown), [shown]);

  useEffect(() => {
    if (loaded) {
      editor.current?.focus();
    }
  }, [loaded]);

  const save = (): void => {
    if (content === null) {
      return;
    }

    setError(null);
    startSaving(async () => {
      try {
        await api.putDesignMd(projectId, content);
        onClose();
      } catch (err) {
        setAsking(false);
        setError(`Could not save DESIGN.md. ${errorText(err)} Try again.`);
      }
    });
  };

  return (
    <dialog
      ref={dialog.ref}
      className="modal dmd"
      aria-label={COPY.labelDesignMd}
      onMouseDown={dialog.onMouseDown}
    >
      <div className="modal-head">
        <div className="titles">
          <h2>
            DESIGN.md
            {dirty && <span className="dmd-dirty">Unsaved</span>}
          </h2>
          <p>The agent reads this file on every run.</p>
        </div>
        <button
          className="icon-btn"
          aria-label={COPY.labelCloseDesignMd}
          onClick={() => requestClose()}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="modal-body dmd-body">
        <Outline
          items={outline}
          onJump={(item, index) =>
            jumpTo(editor.current, preview.current, item, index)
          }
        />
        <div className="dmd-pane">
          <p className="dmd-pane-label">Markdown</p>
          <textarea
            ref={editor}
            className="mono design-md"
            aria-label={COPY.labelDesignMdContent}
            value={content ?? ""}
            disabled={content === null}
            onChange={(e) => {
              setContent(e.target.value);
              setAsking(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void save();
              }
            }}
            placeholder={
              "# Brand\nPrimary color, type, spacing and voice rules the agent should follow."
            }
            spellCheck={false}
          />
        </div>
        <div className="dmd-pane">
          <p className="dmd-pane-label">Preview</p>
          <div
            ref={preview}
            className="dmd-preview"
            aria-label={COPY.labelDesignMdPreview}
            tabIndex={0}
          >
            {shown.trim() ? (
              <Markdown>{shown.replaceAll(/<!--[\s\S]*?-->/gu, "")}</Markdown>
            ) : (
              <p className="dmd-outline-empty">Nothing to show yet.</p>
            )}
          </div>
        </div>
      </div>
      {error && (
        <div className="alert error dmd-error" role="alert">
          {error}
        </div>
      )}
      {asking ? (
        <UnsavedBar
          saving={saving}
          onSave={() => void save()}
          onDiscard={onClose}
          onKeep={() => setAsking(false)}
        />
      ) : (
        <div className="modal-foot">
          <span className="hint">
            <kbd>{MOD_LABEL === "⌘" ? "⌘" : "Ctrl"}</kbd>
            <kbd>S</kbd> to save
          </span>
          <button className="btn ghost" onClick={() => requestClose()}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={() => void save()}
            disabled={saving || content === null || !dirty}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </dialog>
  );
};

export { DesignMdModal };
