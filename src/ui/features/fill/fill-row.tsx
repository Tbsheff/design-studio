import { useCallback, useMemo } from "react";
import type { MutableRefObject, ReactNode } from "react";

import { BlendSelect } from "./blend-select.js";
import { copy } from "./copy.js";
import type {
  DirectEdit,
  FillType,
  PreviewPort,
  SelectionContext,
} from "./deps.js";
import { FillActions } from "./fill-actions.js";
import { FillNoteLine } from "./fill-note.js";
import { GradientFields } from "./gradient-fields.js";
import { PaintField } from "./paint-field.js";
import { TypeTabs } from "./type-tabs.js";
import { useFill } from "./use-fill.js";

import styles from "./fill.module.css";

interface FillRowProps {
  readonly directionId: string;
  readonly edit: DirectEdit;
  readonly fallback: ReactNode;
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly projectId: string;
  readonly target: SelectionContext;
}

const FillRow = ({
  directionId,
  edit,
  fallback,
  port,
  projectId,
  target,
}: FillRowProps): ReactNode => {
  const ids = useMemo(
    () => ({ directionId, projectId }),
    [directionId, projectId]
  );

  const fill = useFill(ids, {
    fallback: edit.values["background-color"],
    port,
    target,
  });

  const { draft, onApply: handleApply, onDraft, onReset: handleReset } = fill;

  const handleType = useCallback(
    (type: FillType): void => {
      onDraft({ ...draft, type });
    },
    [draft, onDraft]
  );

  const handleColor = useCallback(
    (color: string): void => {
      onDraft({ ...draft, color });
    },
    [draft, onDraft]
  );

  if (!target.source) {
    return fallback;
  }

  const disabled = fill.loading || fill.pending;

  return (
    <div className={styles.row}>
      <TypeTabs disabled={disabled} value={draft.type} onPick={handleType} />
      {draft.type === "solid" && (
        <PaintField
          color={draft.color}
          edit={edit}
          label={copy.colorLabel}
          short={copy.color}
          onColor={handleColor}
        />
      )}
      {draft.type !== "solid" && (
        <GradientFields
          disabled={disabled}
          draft={draft}
          edit={edit}
          onDraft={onDraft}
        />
      )}
      <BlendSelect disabled={disabled} draft={draft} onDraft={onDraft} />
      {fill.dirty && (
        <FillActions
          pending={fill.pending}
          onApply={handleApply}
          onReset={handleReset}
        />
      )}
      <FillNoteLine note={fill.note} />
    </div>
  );
};

export { FillRow };

export type { FillRowProps };
