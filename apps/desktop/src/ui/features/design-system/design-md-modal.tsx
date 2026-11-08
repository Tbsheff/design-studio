import type { ReactElement } from "react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { MOD_LABEL } from "../comments/index.js";
import { COPY } from "./copy.js";
import { jumpTo } from "./design-md-model.js";
import { outlineOf } from "./design-md-outline.js";
import type { OutlineItem } from "./design-md-outline.js";
import { DmdEditorPane } from "./dmd-editor-pane.js";
import { DmdFooter } from "./dmd-footer.js";
import { DmdHead } from "./dmd-head.js";
import { DmdOutline } from "./dmd-outline.js";
import { DmdPreviewPane } from "./dmd-preview-pane.js";
import { useBackdropDialog } from "./use-backdrop-dialog.js";
import { useDesignMd } from "./use-design-md.js";

const toModKey = (): string => {
  if (MOD_LABEL === "⌘") {
    return "⌘";
  }

  return "Ctrl";
};

const DesignMdModal = ({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}): ReactElement => {
  const md = useDesignMd(projectId, onClose);
  const { changeContent, content, requestClose, save } = md;
  const ref = useBackdropDialog(requestClose);
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

  const jump = useCallback(
    (item: OutlineItem, index: number): void =>
      jumpTo(editor.current, preview.current, item, index),
    []
  );

  return (
    <dialog ref={ref} className="modal dmd" aria-label={COPY.labelDesignMd}>
      <DmdHead isDirty={md.isDirty} onClose={requestClose} />
      <div className="modal-body dmd-body">
        <DmdOutline items={outline} onJump={jump} />
        <DmdEditorPane
          content={content}
          editorRef={editor}
          onChange={changeContent}
          onSave={save}
        />
        <DmdPreviewPane previewRef={preview} shown={shown} />
      </div>
      {md.message && (
        <div className="alert error dmd-error" role="alert">
          {md.message}
        </div>
      )}
      <DmdFooter md={md} modKey={toModKey()} onClose={onClose} />
    </dialog>
  );
};

export { DesignMdModal };
