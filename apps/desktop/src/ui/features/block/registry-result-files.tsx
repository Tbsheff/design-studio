import type { ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./block.module.css";

interface RegistryResultFilesProps {
  readonly files: readonly string[];
}

const RegistryResultFiles = ({
  files,
}: RegistryResultFilesProps): ReactElement => (
  <ul aria-label={copy.addedFiles} className={styles.resultFiles}>
    {files.map((file) => (
      <li key={file}>
        <code>{file}</code>
      </li>
    ))}
  </ul>
);

export { RegistryResultFiles };
