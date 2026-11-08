import type { ReactElement } from "react";
import { useMemo } from "react";

import { PARTS } from "./effects-model.js";
import type { ShadowView } from "./effects-model.js";
import { ColorField } from "./inspector-fields.js";
import { ShadowHead } from "./shadow-head.js";
import { ShadowPartField } from "./shadow-part-field.js";
import type { Shadow } from "./shadows-model.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { useShadowColorUi } from "./use-shadow-color-ui.js";
import { toFieldEdit } from "./use-shadow-row.js";
import { TokenUiContext } from "./use-token-snap.js";

const ShadowRow = ({
  edit,
  view,
  index,
}: {
  readonly edit: DirectEdit;
  readonly view: ShadowView;
  readonly index: number;
}): ReactElement => {
  const shadow = view.list[index] as Shadow;
  const count = index + 1;
  const field = useMemo(() => ({ edit, index, view }), [edit, index, view]);
  const colorUi = useShadowColorUi();

  const colorEdit = useMemo(
    () => toFieldEdit(field, "color", shadow.color, (color) => ({ color })),
    [field, shadow.color]
  );

  return (
    <li className="ins-shadow" aria-label={`Shadow ${count}`}>
      <ShadowHead
        edit={edit}
        view={view}
        index={index}
        isInset={shadow.isInset}
      />
      <div className="ins-grid">
        {PARTS.map(({ part, short, label, min }) => (
          <ShadowPartField
            key={part}
            field={field}
            part={part}
            short={short}
            label={label}
            min={min ?? null}
            shadow={shadow}
            count={count}
          />
        ))}
      </div>
      <TokenUiContext.Provider value={colorUi}>
        <ColorField
          prop="color"
          label={`Shadow ${count} color`}
          short="Color"
          edit={colorEdit}
        />
      </TokenUiContext.Provider>
    </li>
  );
};

export { ShadowRow };
