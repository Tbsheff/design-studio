import { useMemo } from "react";

import { Icon } from "../../kit/Icon.js";
import {
  PARTS,
  fieldPart,
  writeShadows,
  type Field,
  type ShadowView,
} from "./effects-model.js";
import { ColorField } from "./inspector-fields.js";
import { NumberField } from "./number-field.js";
import { proxyEdit } from "./proxy-edit.js";
import { formatShadows, type Shadow } from "./shadows.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { TokenUiContext, useTokenUi } from "./use-token-snap.js";

const ShadowRow = ({
  edit,
  view,
  index,
}: {
  edit: DirectEdit;
  view: ShadowView;
  index: number;
}) => {
  const { list } = view;
  const shadow = list[index] as Shadow;
  const n = index + 1;

  const replace = (patch: Partial<Shadow>) => ({
    "box-shadow": formatShadows(
      list.map((s, i) => (i === index ? { ...s, ...patch } : s))
    ),
  });

  const fieldEdit = (
    field: Field,
    value: string,
    write: (next: string) => Partial<Shadow>
  ) =>
    proxyEdit(
      edit,
      field === "color" ? "color" : "width",
      value,
      (next) => replace(write(next)),
      ["box-shadow"],
      {
        part: fieldPart(index, field),
        mixed: view.mixed?.has(`${index}.${field}`) ?? false,
      }
    );

  const ui = useTokenUi();

  const colorUi = useMemo(() => {
    const request = ui?.requestCreate;

    return ui
      ? {
          ...ui,
          requestCreate: request
            ? (req: Parameters<typeof request>[0]) =>
                request({ ...req, targets: [] })
            : null,
        }
      : null;
  }, [ui]);

  const colorEdit = fieldEdit("color", shadow.color, (color) => ({ color }));

  return (
    <li className="ins-shadow" aria-label={`Shadow ${n}`}>
      <div className="ins-shadow-head">
        <span className="ins-shadow-name">Shadow {n}</span>
        <button
          type="button"
          className="ins-chip-toggle"
          aria-pressed={shadow.inset}
          aria-label={`Shadow ${n} inset`}
          data-tip={shadow.inset ? "Inner shadow" : "Drop shadow"}
          onClick={() =>
            writeShadows(edit, view, (own) =>
              own.map((s, i) =>
                i === index ? { ...s, inset: !shadow.inset } : s
              )
            )
          }
        >
          Inset
        </button>
        <button
          type="button"
          className="icon-btn small"
          aria-label={`Remove shadow ${n}`}
          data-tip="Remove shadow"
          data-tip-align="end"
          onClick={() =>
            writeShadows(edit, view, (own) => own.filter((_, i) => i !== index))
          }
        >
          <Icon name="minus" size={14} />
        </button>
      </div>
      <div className="ins-grid">
        {PARTS.map(({ part, short, label, min }) => (
          <NumberField
            key={part}
            id={`ins-shadow-${index}-${part}`}
            short={short}
            tokens={false}
            spec={{
              prop: "width",
              label: `Shadow ${n} ${label.toLowerCase()}`,
              min,
              edit: fieldEdit(part, shadow[part], (value) => ({
                [part]: value || "0",
              })),
            }}
          />
        ))}
      </div>
      <TokenUiContext.Provider value={colorUi}>
        <ColorField
          prop="color"
          label={`Shadow ${n} color`}
          short="Color"
          edit={colorEdit}
        />
      </TokenUiContext.Provider>
    </li>
  );
};

export { ShadowRow };
