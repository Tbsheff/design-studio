import { useMemo } from "react";
import type { ReactElement, ReactNode } from "react";

import { copy } from "./copy.js";
import type { SelectionContext } from "./deps.js";
import { EffectAddMenu } from "./effect-add-menu.js";
import { EffectList } from "./effect-list.js";
import { toRowKeys, toShadowSizes } from "./effect-model.js";
import { EffectNote } from "./effect-note.js";
import { useEffectHandlers } from "./use-effect-handlers.js";
import { useEffects } from "./use-effects.js";

import styles from "./effect.module.css";

interface EffectPanelProps {
  readonly directionId: string;
  readonly fallback: ReactNode;
  readonly projectId: string;
  readonly target: SelectionContext;
  readonly variant: string;
}

const toEmptyNode = (fallback: ReactNode): ReactNode => {
  if (fallback) {
    return fallback;
  }

  return <EffectNote isError={false} text={copy.empty} />;
};

const EffectPanel = ({
  directionId,
  fallback,
  projectId,
  target,
  variant,
}: EffectPanelProps): ReactElement => {
  const ids = useMemo(
    () => ({ directionId, projectId }),
    [directionId, projectId]
  );

  const effects = useEffects(ids, target, variant);
  const handlers = useEffectHandlers(effects);
  const { info } = effects;
  const list = useMemo(() => info?.effects ?? [], [info]);
  const keys = useMemo(() => toRowKeys(list), [list]);
  const sizes = useMemo(() => toShadowSizes(info), [info]);
  const isOff = info === null || effects.isPending;

  return (
    <div className={styles.body}>
      <EffectList
        handlers={handlers}
        isOff={isOff}
        items={list}
        keys={keys}
        sizes={sizes}
      />
      {list.length === 0 && info !== null && toEmptyNode(fallback)}
      <EffectAddMenu disabled={isOff} onAdd={handlers.handleAdd} />
      <EffectNote isError text={effects.error} />
    </div>
  );
};

export { EffectPanel };

export type { EffectPanelProps };
