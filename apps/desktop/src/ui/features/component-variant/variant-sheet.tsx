import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactElement, SyntheticEvent } from "react";

import { copy } from "./copy.js";
import { DraftPreview } from "./draft-preview.js";
import { SheetFields } from "./sheet-fields.js";
import { SheetFoot } from "./sheet-foot.js";
import { useVariantDraft } from "./use-variant-draft.js";
import { VariantGrid } from "./variant-grid.js";
import { knownClassesOf } from "./variant-model.js";
import type { VariantSheetProps } from "./variant-model.js";

import styles from "./component-variant.module.css";

const NO_CLASSES: readonly string[] = [];

const VariantSheet = (props: VariantSheetProps): ReactElement => {
  const { component, directionId, group, mode, onClose, projectId } = props;
  const ref = useRef<HTMLDialogElement>(null);
  const state = useVariantDraft(props);

  const ids = useMemo(
    () => ({ directionId, projectId }),
    [directionId, projectId]
  );

  const known = useMemo(() => {
    if (!component.cva) {
      return NO_CLASSES;
    }

    return knownClassesOf(component.cva);
  }, [component.cva]);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const handleCancel = useCallback(
    (event: SyntheticEvent): void => {
      event.preventDefault();
      onClose();
    },
    [onClose]
  );

  let title: string = copy.createTitle;

  if (mode === "edit") {
    title = copy.editTitle;
  }

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-label={`${title}: ${component.name} ${group.prop}`}
      onCancel={handleCancel}
    >
      <header className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        <code
          className={styles.target}
        >{`${component.name} ${group.prop}`}</code>
      </header>
      <VariantGrid
        file={component.file}
        group={group}
        ids={ids}
        name={component.name}
        picked={state.draft.from}
        onPick={state.handlePick}
      />
      <div className={styles.body}>
        <SheetFields group={group} known={known} mode={mode} state={state} />
        <DraftPreview
          classes={state.draft.classes}
          file={component.file}
          from={state.draft.from}
          ids={ids}
          name={component.name}
          prop={group.prop}
        />
      </div>
      <SheetFoot state={state} onClose={onClose} />
    </dialog>
  );
};

export { VariantSheet };
