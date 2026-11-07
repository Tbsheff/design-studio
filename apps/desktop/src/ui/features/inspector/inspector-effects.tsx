import { useEffect, useRef } from "react";

import type { ShiftPart } from "./css-values.js";
import { writeShadows, shadowView } from "./effects-model.js";
import { InspectorSection } from "./inspector-fields.js";
import { AddButton } from "./inspector-shared.js";
import { PlainNumberField } from "./number-field.js";
import { proxyEdit } from "./proxy-edit.js";
import { ShadowRow } from "./shadow-row.js";
import { NEW_SHADOW, blurOf, withBlur } from "./shadows.js";
import type { Shadow } from "./shadows.js";
import type { DirectEdit } from "./use-direct-edit.js";

const BLUR_PART: ShiftPart = {
  key: "blur",
  map: (raw, change) => withBlur(raw, change(blurOf(raw) || "0")),
};

const LayerBlur = ({ edit }: { readonly edit: DirectEdit }) => {
  const { filter } = edit.values;

  const blur = proxyEdit(
    edit,
    "width",
    blurOf(filter),
    (value) => ({ filter: withBlur(filter, value) }),
    ["filter"],
    { isMixed: null, part: BLUR_PART }
  );

  return (
    <PlainNumberField
      id="ins-layer-blur"
      short="Blur"
      spec={{ edit: blur, label: "Layer blur", min: 0, prop: "width" }}
    />
  );
};

const useScrollInOnMount = (on: boolean) => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (on) {
      ref.current?.closest("section")?.scrollIntoView({ block: "nearest" });
    }
  }, []);

  return ref;
};

const EffectsSection = ({
  edit,
  isRevealed: revealed = false,
}: {
  readonly edit: DirectEdit;
  readonly isRevealed: boolean;
}) => {
  const view = shadowView(edit);
  const anchor = useScrollInOnMount(revealed);

  return (
    <InspectorSection title="Effects">
      <span ref={anchor} hidden />
      {view === null ? (
        <div className="ins-custom">
          <code
            className="ins-custom-value"
            data-tip={edit.values["box-shadow"]}
          >
            {edit.values["box-shadow"] || "Mixed"}
          </code>
          <button
            type="button"
            className="btn ghost small"
            onClick={() =>
              writeShadows(edit, { list: [], mixed: null }, () => [])
            }
          >
            Clear
          </button>
        </div>
      ) : (
        view.list.length > 0 && (
          <ul className="ins-shadows">
            {view.list.map((_, index) => (
              <ShadowRow key={index} edit={edit} view={view} index={index} />
            ))}
          </ul>
        )
      )}
      {view !== null && (
        <div className="ins-add-row">
          <AddButton
            label="Shadow"
            onClick={() =>
              writeShadows(edit, view, (own) => [...own, NEW_SHADOW])
            }
          />
        </div>
      )}
      <div className="ins-grid">
        <LayerBlur edit={edit} />
      </div>
    </InspectorSection>
  );
};

export { EffectsSection };
