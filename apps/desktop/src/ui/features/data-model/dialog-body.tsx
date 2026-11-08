import { useCallback } from "react";
import type { ReactElement } from "react";

import { closeSampleDataDialog } from "./deps.js";
import { DialogFoot } from "./dialog-foot.js";
import { MainPane } from "./main-pane.js";
import { SidePane } from "./side-pane.js";
import { useDataModel } from "./use-data-model.js";

import styles from "./data-model.module.css";

interface DialogBodyProps {
  readonly onInsert: (text: string) => void;
  readonly projectId: string;
}

const DialogBody = ({ onInsert, projectId }: DialogBodyProps): ReactElement => {
  const state = useDataModel(projectId);

  const handleAdd = useCallback(
    (text: string): void => {
      onInsert(text);
      closeSampleDataDialog();
    },
    [onInsert]
  );

  return (
    <>
      <div className={styles.body}>
        <SidePane state={state} />
        <MainPane state={state} />
      </div>
      <DialogFoot
        detail={state.detail}
        onAdd={handleAdd}
        variant={state.variant}
      />
    </>
  );
};

export { DialogBody };
