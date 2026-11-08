import type { ReactElement } from "react";

import { CompletionCap } from "./completion-cap.js";
import { CompletionLog } from "./completion-log.js";
import { toSpentText } from "./completion-model.js";
import { CompletionSwitch } from "./completion-switch.js";
import { copy } from "./copy.js";
import { useCompletion } from "./use-completion.js";

import styles from "./completion.module.css";

const toNote = (isEnabled: boolean): string => {
  if (isEnabled) {
    return copy.onNote;
  }

  return copy.offNote;
};

const CompletionPanel = (): ReactElement => {
  const state = useCompletion();

  if (state.projectId === null) {
    return <p className={styles.note}>{copy.noProject}</p>;
  }

  return (
    <section aria-label={copy.title} className={styles.panel}>
      <h3>{copy.title}</h3>
      <div className={styles.head}>
        <CompletionSwitch
          isEnabled={state.isEnabled}
          isPending={state.isPending}
          onChange={state.handleSaveEnabled}
        />
        <CompletionCap capUsd={state.capUsd} onCommit={state.handleSaveCap} />
      </div>
      <p className={styles.note}>{toNote(state.isEnabled)}</p>
      <p className={styles.note}>{toSpentText(state.spentUsd)}</p>
      <h4>{copy.logTitle}</h4>
      <CompletionLog records={state.records} />
      {state.error !== null && <p role="alert">{state.error}</p>}
    </section>
  );
};

export { CompletionPanel };
