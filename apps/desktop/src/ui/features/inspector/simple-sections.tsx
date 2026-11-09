import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";

import { AppearanceSection } from "./appearance-section.js";
import { BorderSection } from "./border-section.js";
import type { DirectEdit } from "./deps.js";
import type { ElementClasses } from "./element-classes-model.js";
import { EffectsSection } from "./inspector-effects.js";
import { LayoutSection } from "./layout-section.js";
import { SHADOW_PRESET, applyEdit, toExtrasInUse } from "./simple-model.js";
import type { Extra } from "./simple-model.js";
import { TextSection } from "./text-section.js";
import type { TokenUi } from "./use-token-snap.js";

interface SimpleSectionsProps {
  readonly edit: DirectEdit;
  readonly ui: TokenUi | null;
  readonly selection: SelectionContext | null;
  readonly classes: ElementClasses | null;
  readonly textStyle: ReactNode;
  readonly fill: ReactNode;
}

const SimpleSections = ({
  edit,
  ui,
  selection,
  classes,
  textStyle,
  fill,
}: SimpleSectionsProps): ReactElement => {
  const [revealed, setRevealed] = useState<Set<Extra>>(() => new Set());

  const extras = useMemo(
    () => new Set([...toExtrasInUse(edit), ...revealed]),
    [edit, revealed]
  );

  const reveal = useCallback(
    (extra: Extra) => {
      setRevealed((previous) => new Set(previous).add(extra));

      if (extra === "shadow") {
        applyEdit(edit, { "box-shadow": SHADOW_PRESET });
      }
    },
    [edit]
  );

  return (
    <>
      <LayoutSection edit={edit} selection={selection} />
      <TextSection
        edit={edit}
        ui={ui}
        selection={selection}
        classes={classes}
        textStyle={textStyle}
      />
      <AppearanceSection
        edit={edit}
        extras={extras}
        fill={fill}
        onReveal={reveal}
      />
      {extras.has("shadow") && (
        <EffectsSection edit={edit} isRevealed={revealed.has("shadow")} />
      )}
      <BorderSection edit={edit} />
    </>
  );
};

export { SimpleSections };
