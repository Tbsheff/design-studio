import type { ReactElement } from "react";

import type { ImportOutput } from "./block-model.js";
import { copy } from "./copy.js";
import { RegistryResultFiles } from "./registry-result-files.js";

import styles from "./block.module.css";

interface RegistryResultProps {
  readonly result: ImportOutput;
}

const RegistryResult = ({ result }: RegistryResultProps): ReactElement => (
  <div className={styles.result} data-registry-result="">
    <p className={styles.note}>{copy.addedTitle}</p>
    <RegistryResultFiles files={result.files} />
    {result.command !== "" && (
      <p className={styles.note}>{copy.needsPackages}</p>
    )}
    {result.command !== "" && (
      <code className={styles.command}>{result.command}</code>
    )}
    {result.command === "" && <p className={styles.note}>{copy.addedNone}</p>}
  </div>
);

export { RegistryResult };
