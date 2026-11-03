import { useEffect, useRef } from "react";

import { AddButton } from "../../components/InspectorShared.js";
import type { ShiftPart } from "../../cssValues.js";
import { proxyEdit } from "../../proxyEdit.js";
import { NEW_SHADOW, blurOf, withBlur, type Shadow } from "../../shadows.js";
import type { DirectEdit } from "../../useDirectEdit.js";
import { writeShadows, shadowView } from "./effects-model.js";
import { InspectorSection } from "./inspector-fields.js";
import { NumberField } from "./number-field.js";
import { ShadowRow } from "./shadow-row.js";

const BLUR_PART: ShiftPart = {
  key: "blur",
  map: (raw, change) => withBlur(raw, change(blurOf(raw) || "0")),
};

const LayerBlur = ({ edit }: { edit: DirectEdit }) => {
  const filter = edit.values.filter;

  const blur = proxyEdit(
    edit,
    "width",
    blurOf(filter),
    (value) => ({ filter: withBlur(filter, value) }),
    ["filter"],
    { part: BLUR_PART }
  );

  return (
    <NumberField
      id="ins-layer-blur"
      short="Blur"
      tokens={false}
      spec={{ prop: "width", label: "Layer blur", edit: blur, min: 0 }}
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
  revealed = false,
}: {
  edit: DirectEdit;
  revealed?: boolean;
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
