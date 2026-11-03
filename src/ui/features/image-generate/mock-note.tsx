import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { openAppPanel } from "./deps.js";

import styles from "./image-generate.module.css";

const MockNote = (): ReactElement => {
  const handleSettings = useCallback((): void => {
    openAppPanel("settings");
  }, []);

  return (
    <p className={styles.mock}>
      <strong>{copy.mockBody}</strong> {copy.mockNote}{" "}
      <button className={styles.link} type="button" onClick={handleSettings}>
        {copy.mockLink}
      </button>
    </p>
  );
};

export { MockNote };
