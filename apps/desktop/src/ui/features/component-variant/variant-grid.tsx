import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { VariantGroup } from "./deps.js";
import type { PreviewIds } from "./use-preview-image.js";
import { VariantCell } from "./variant-cell.js";

import styles from "./component-variant.module.css";

interface VariantGridProps {
  readonly file: string;
  readonly group: VariantGroup;
  readonly ids: PreviewIds;
  readonly name: string;
  readonly onPick: (value: string) => void;
  readonly picked: string;
}

const VariantGrid = (props: VariantGridProps): ReactElement => {
  const { group } = props;

  return (
    <section className={styles.gridWrap} aria-label={copy.grid}>
      <span className={styles.label}>{copy.grid}</span>
      <div className={styles.grid}>
        {group.options.map((option) => (
          <VariantCell
            key={option.value}
            file={props.file}
            ids={props.ids}
            isDefault={option.value === group.default}
            isPicked={option.value === props.picked}
            name={props.name}
            option={option}
            prop={group.prop}
            onPick={props.onPick}
          />
        ))}
      </div>
    </section>
  );
};

export { VariantGrid };
