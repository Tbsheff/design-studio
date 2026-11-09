import { useCallback, useMemo, useState, useTransition } from "react";
import type { ChangeEvent } from "react";

import { toFilledText, toNote, toPreview } from "./data-fill-model.js";
import type { DataFillPreview } from "./data-fill-model.js";
import { contentRoutes, useAction } from "./deps.js";
import type { SelectionContext } from "./deps.js";

interface DataFillOptions {
  readonly directionId: string;
  readonly projectId: string;
  readonly target: SelectionContext;
}

interface DataFillView {
  readonly canApply: boolean;
  readonly error: string | null;
  readonly filledText: string;
  readonly handleApply: () => void;
  readonly handleText: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  readonly handleToggle: () => void;
  readonly isBusy: boolean;
  readonly isOpen: boolean;
  readonly note: string;
  readonly preview: DataFillPreview;
  readonly text: string;
}

const useDataFill = (options: DataFillOptions): DataFillView => {
  const { directionId, projectId, target } = options;
  const importRows = useAction(contentRoutes.importContent);
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [filledRows, setFilledRows] = useState<number | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const { source } = target;
  const preview = useMemo(() => toPreview(text), [text]);

  const handleToggle = useCallback(() => setIsOpen((current) => !current), []);

  const handleText = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    setFilledRows(null);
  }, []);

  const handleApply = useCallback(() => {
    if (source === null) {
      return;
    }

    const layer = { col: source.col, file: source.file, line: source.line };

    startSubmit(async () => {
      const result = await importRows.run({
        columns: null,
        directionId,
        layer,
        projectId,
        text,
      });

      if (result !== null) {
        setFilledRows(result.rows);
      }
    });
  }, [directionId, importRows, projectId, source, text]);

  const canApply = source !== null && preview.total > 0;
  const isBusy = isSubmitting || importRows.pending;

  const error = importRows.error?.message ?? null;
  const filledText = toFilledText(filledRows);
  const note = toNote(preview);

  return {
    canApply,
    error,
    filledText,
    handleApply,
    handleText,
    handleToggle,
    isBusy,
    isOpen,
    note,
    preview,
    text,
  };
};

export { useDataFill };

export type { DataFillOptions, DataFillView };
