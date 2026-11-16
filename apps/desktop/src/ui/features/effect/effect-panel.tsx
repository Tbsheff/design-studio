import { useMemo } from "react";
import type { ComponentType, ReactElement, ReactNode } from "react";

import type { SelectionContext } from "./deps.js";
import { EffectAddMenu } from "./effect-add-menu.js";
import { EffectList } from "./effect-list.js";
import { toRowKeys, toShadowSizes } from "./effect-model.js";
import { EffectNote } from "./effect-note.js";
import { EffectStyleBar } from "./effect-style-bar.js";
import { useEffectHandlers } from "./use-effect-handlers.js";
import { useEffects } from "./use-effects.js";

import styles from "./effect.module.css";

interface EffectPanelProps {
  readonly directionId: string;
  readonly projectId: string;
  readonly target: SelectionContext;
  readonly variant: string;
  readonly isHiddenWhenEmpty: boolean;
  readonly frame: ComponentType<{ readonly children: ReactNode }>;
}

const EffectPanel = ({
  directionId,
  projectId,
  target,
  variant,
  isHiddenWhenEmpty,
  frame: Frame,
}: EffectPanelProps): ReactElement | null => {
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

  if (isHiddenWhenEmpty && list.length === 0) {
    return null;
  }

  return (
    <Frame>
      <div className={styles.body}>
        <EffectList
          handlers={handlers}
          isOff={isOff}
          items={list}
          keys={keys}
          sizes={sizes}
        />
        <EffectAddMenu disabled={isOff} onAdd={handlers.handleAdd} />
        {(list.length > 0 || effects.styles.length > 0) && (
          <EffectStyleBar
            canSave={list.length > 0}
            disabled={isOff}
            styleName={info?.styleName ?? null}
            styles={effects.styles}
            onPick={effects.handleStyle}
            onSave={effects.handleSave}
          />
        )}
        <EffectNote isError text={effects.error} />
      </div>
    </Frame>
  );
};

export { EffectPanel };

export type { EffectPanelProps };
