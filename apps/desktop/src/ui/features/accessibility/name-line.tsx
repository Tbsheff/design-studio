import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { AccessibleNode } from "./deps.js";

import styles from "./accessibility.module.css";

interface NameLineProps {
  readonly node: AccessibleNode | null;
}

const NameLine = ({ node }: NameLineProps): ReactElement | null => {
  if (node === null) {
    return null;
  }

  if (node.nameFrom === "none" || node.name.trim() === "") {
    return <p className={styles.error}>{copy.noName}</p>;
  }

  return (
    <div className={styles.line}>
      <span className={styles.label}>{copy.name}</span>
      <span>{node.name}</span>
      <span className={styles.note}>{copy.nameFrom(node.nameFrom)}</span>
    </div>
  );
};

export { NameLine };

export type { NameLineProps };
