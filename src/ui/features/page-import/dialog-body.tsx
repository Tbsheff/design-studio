import { useCallback } from "react";
import type { FormEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { SelectorField } from "./selector-field.js";
import { UrlField } from "./url-field.js";
import type { PageImportState } from "./use-page-import.js";
import { ViewportField } from "./viewport-field.js";

import styles from "./page-import.module.css";

interface DialogBodyProps {
  readonly formId: string;
  readonly state: PageImportState;
}

const DialogBody = ({ formId, state }: DialogBodyProps): ReactElement => {
  const { startImport } = state;

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      startImport();
    },
    [startImport]
  );

  return (
    <form id={formId} className={styles.body} onSubmit={handleSubmit}>
      <UrlField state={state} />
      <ViewportField state={state} />
      <SelectorField state={state} />
      <p className={styles.note}>{copy.note}</p>
    </form>
  );
};

export { DialogBody };
