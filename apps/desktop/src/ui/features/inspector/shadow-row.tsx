import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useMemo } from "react";

import { copy } from "./copy.js";
import { PARTS, fieldPart, writeShadows } from "./effects-model.js";
import type { Field, ShadowView } from "./effects-model.js";
import { ColorField } from "./inspector-fields.js";
import { PlainNumberField } from "./plain-number-field.js";
import { toShadowsText } from "./shadows-model.js";
import type { Shadow } from "./shadows-model.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { createProxyEdit } from "./use-proxy-edit.js";
import { TokenUiContext, useTokenUi } from "./use-token-snap.js";

const ShadowRow = ({
  edit,
  view,
  index,
}: {
  readonly edit: DirectEdit;
  readonly view: ShadowView;
  readonly index: number;
}): ReactElement => {
  const { list } = view;
  const shadow = list[index] as Shadow;
  const count = index + 1;

  const replace = (
    patch: Partial<Shadow>
  ): { readonly "box-shadow": string } => ({
    "box-shadow": toShadowsText(
      list.map((shadowValue, indexValue) =>
        indexValue === index ? { ...shadowValue, ...patch } : shadowValue
      )
    ),
  });

  const fieldEdit = (
    field: Field,
    value: string,
    write: (next: string) => Partial<Shadow>
  ): ReturnType<typeof createProxyEdit> =>
    createProxyEdit(edit, field === "color" ? "color" : "width", value, {
      isMixed: view.mixed?.has(`${index}.${field}`) ?? false,
      part: fieldPart(index, field),
      real: ["box-shadow"],
      write: (next) => replace(write(next)),
    });

  const ui = useTokenUi();

  const colorUi = useMemo(() => {
    const request = ui?.requestCreate;

    return ui
      ? {
          ...ui,
          requestCreate: request
            ? (req: Parameters<typeof request>[0]): void =>
                request({ ...req, targets: [] })
            : null,
        }
      : null;
  }, [ui]);

  const colorEdit = fieldEdit("color", shadow.color, (color) => ({ color }));

  return (
    <li className="ins-shadow" aria-label={`Shadow ${count}`}>
      <div className="ins-shadow-head">
        <span className="ins-shadow-name">
          {copy.shadow}
          {count}
        </span>
        <button
          type="button"
          className="ins-chip-toggle"
          aria-pressed={shadow.isInset}
          aria-label={`Shadow ${count} inset`}
          data-tip={shadow.isInset ? "Inner shadow" : "Drop shadow"}
          onClick={() =>
            writeShadows(edit, view, (own) =>
              own.map((shadowValue2, indexValue2) =>
                indexValue2 === index
                  ? { ...shadowValue2, isInset: !shadow.isInset }
                  : shadowValue2
              )
            )
          }
        >
          {copy.inset}
        </button>
        <button
          type="button"
          className="icon-btn small"
          aria-label={`Remove shadow ${count}`}
          data-tip={copy.removeShadow}
          data-tip-align="end"
          onClick={() =>
            writeShadows(edit, view, (own) =>
              own.filter((_shadowValue3, indexValue3) => indexValue3 !== index)
            )
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
              label: `Shadow ${count} ${label.toLowerCase()}`,
              min,
              prop: "width",
            }}
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
