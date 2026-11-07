import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { SelectionContext } from "./deps.js";
import { EffectAddMenu } from "./effect-add-menu.js";
import { EffectList } from "./effect-list.js";
import { toRowKeys } from "./effect-model.js";
import { EffectNote } from "./effect-note.js";
import { EffectStyleBar } from "./effect-style-bar.js";
import { useEffectHandlers } from "./use-effect-handlers.js";
import { useEffects } from "./use-effects.js";

import styles from "./effect.module.css";

interface EffectPanelProps {
  readonly directionId: string;
  readonly projectId: string;
  readonly target: SelectionContext;
}

const EffectPanel = ({
  directionId,
  projectId,
  target,
}: EffectPanelProps): ReactElement => {
  const ids = useMemo(
    () => ({ directionId, projectId }),
    [directionId, projectId]
  );

  const effects = useEffects(ids, target);
  const handlers = useEffectHandlers(effects);
  const { info } = effects;
  const list = useMemo(() => info?.effects ?? [], [info]);
  const keys = useMemo(() => toRowKeys(list), [list]);
  const isOff = info === null || effects.isPending;

  return (
    <div className={styles.body}>
      <EffectList handlers={handlers} isOff={isOff} items={list} keys={keys} />
      {list.length === 0 && info !== null && (
        <EffectNote isError={false} text={copy.empty} />
      )}
      <EffectAddMenu disabled={isOff} onAdd={handlers.handleAdd} />
      <EffectStyleBar
        canSave={list.length > 0}
        disabled={isOff}
        styleName={info?.styleName ?? null}
        styles={effects.styles}
        onPick={effects.handleStyle}
        onSave={effects.handleSave}
      />
      <EffectNote isError text={effects.error} />
    </div>
  );
};

export { EffectPanel };

export type { EffectPanelProps };
