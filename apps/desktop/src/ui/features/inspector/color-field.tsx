import { memo } from "react";
import type { ReactElement } from "react";

import { toVarAlphaColor } from "./color-popup-model.js";
import { ColorSwatch } from "./color-swatch.js";
import { copy } from "./copy.js";
import { toDisplayColor, isValidColor } from "./css-value-model.js";
import { TokenControl } from "./deps.js";
import { EyedropperButton } from "./eyedropper-button.js";
import {
  toModifiedClass,
  toPlaceholder,
  toResolvedColor,
} from "./field-model.js";
import { useColorField } from "./use-color-field.js";
import { isInherited, useVariantScope } from "./use-edit-variant.js";
import { isSameField } from "./use-same-field.js";
import type { FieldProps } from "./use-same-field.js";
import { useTokenUi } from "./use-token-snap.js";

const ColorFieldView = ({
  prop,
  label,
  short,
  edit,
}: FieldProps): ReactElement => {
  const ui = useTokenUi();
  const value = edit.values[prop];
  const resolved = toVarAlphaColor(value, (raw) => toResolvedColor(raw, ui));
  const field = useColorField({ edit, prop, shown: resolved });
  const isInheritedField = isInherited(useVariantScope(), prop);

  const id = `ins-${prop}-${label.replaceAll(/\W+/gu, "-").toLowerCase()}`;

  return (
    <div
      className={toModifiedClass(
        "ins-field color",
        "inherited",
        isInheritedField
      )}
    >
      <label htmlFor={id} className="ins-scrub static">
        {short}
      </label>
      <input
        id={id}
        className="ins-input"
        aria-label={label}
        aria-invalid={field.text !== null && !isValidColor(field.text)}
        value={field.text ?? toDisplayColor(value)}
        spellCheck={false}
        autoComplete="off"
        placeholder={toPlaceholder(edit.mixed.has(prop), copy.none)}
        onChange={field.handleTextChange}
        onKeyDown={field.handleKeyDown}
        onBlur={field.handleSettle}
      />
      <ColorSwatch
        label={label}
        shown={resolved}
        isDisabled={false}
        target={field.target}
      />
      <EyedropperButton prop={prop} edit={edit} />
      <TokenControl prop={prop} label={label} edit={edit} />
    </div>
  );
};

const ColorField = memo(ColorFieldView, isSameField);

export { ColorField };
