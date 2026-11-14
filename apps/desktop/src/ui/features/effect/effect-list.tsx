import type { ReactElement } from "react";

import type { ShadowSizes } from "./effect-model.js";
import { EffectRow } from "./effect-row.js";
import type { EffectItem } from "./effect-types.js";
import type { EffectHandlers } from "./use-effect-handlers.js";

import styles from "./effect.module.css";

interface EffectListProps {
  readonly handlers: EffectHandlers;
  readonly isOff: boolean;
  readonly items: readonly EffectItem[];
  readonly keys: readonly string[];
  readonly sizes: ShadowSizes;
}

const EffectList = ({
  handlers,
  isOff,
  items,
  keys,
  sizes,
}: EffectListProps): ReactElement | null => {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className={styles.list}>
      {items.map((item, index) => (
        <EffectRow
          key={keys[index]}
          disabled={isOff}
          index={index}
          isFirst={index === 0}
          isLast={index === items.length - 1}
          item={item}
          onChange={handlers.handleChange}
          onMove={handlers.handleMove}
          onRemove={handlers.handleRemove}
          sizes={sizes}
        />
      ))}
    </ul>
  );
};

export { EffectList };

export type { EffectListProps };
