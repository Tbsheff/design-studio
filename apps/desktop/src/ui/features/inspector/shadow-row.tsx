import { Icon } from "@design-studio/ui";
import { useMemo } from "react";

import { copy } from "./copy.js";
import { PARTS, fieldPart, writeShadows } from "./effects-model.js";
import type { Field, ShadowView } from "./effects-model.js";
import { ColorField } from "./inspector-fields.js";
import { PlainNumberField } from "./number-field.js";
import { proxyEdit } from "./proxy-edit.js";
import { formatShadows } from "./shadows.js";
import type { Shadow } from "./shadows.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { TokenUiContext, useTokenUi } from "./use-token-snap.js";

const ShadowRow = ({
  edit,
  view,
  index,
}: {
  readonly edit: DirectEdit;
  readonly view: ShadowView;
  readonly index: number;
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
        isMixed: view.mixed?.has(`${index}.${field}`) ?? false,
        part: fieldPart(index, field),
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
          aria-pressed={shadow.isInset}
          aria-label={`Shadow ${n} inset`}
          data-tip={shadow.isInset ? "Inner shadow" : "Drop shadow"}
          onClick={() =>
            writeShadows(edit, view, (own) =>
              own.map((s, i) =>
                i === index ? { ...s, isInset: !shadow.isInset } : s
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
          data-tip={copy.removeShadow}
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
          <PlainNumberField
            key={part}
            id={`ins-shadow-${index}-${part}`}
            short={short}
            spec={{
              edit: fieldEdit(part, shadow[part], (value) => ({
                [part]: value || "0",
              })),
              label: `Shadow ${n} ${label.toLowerCase()}`,
              min,
              prop: "width",
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
