import { memo, useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { displayColor, isValidColor } from "./css-values.js";
import { TokenControl } from "./deps.js";
import { isInherited, useVariantScope } from "./edit-variant.js";
import {
  toColorHex,
  toModifiedClass,
  toPlaceholder,
  toResolvedColor,
} from "./field-model.js";
import { useColorField } from "./use-color-field.js";
import { isSameField } from "./use-same-field.js";
import type { FieldProps } from "./use-same-field.js";
import { useTokenUi } from "./use-token-snap.js";

const NEUTRAL_SWATCH = "#ffffff";

const ColorFieldView = ({
  prop,
  label,
  short,
  edit,
}: FieldProps): ReactElement => {
  const field = useColorField({ edit, prop });
  const ui = useTokenUi();
  const value = edit.values[prop];
  const resolved = toResolvedColor(value, ui);
  const hex = toColorHex(resolved, ui);
  const isInheritedField = isInherited(useVariantScope(), prop);

  const swatchStyle = useMemo(
    () => ({ ["--swatch" as string]: resolved || "transparent" }),
    [resolved]
  );

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
        value={field.text ?? displayColor(value)}
        spellCheck={false}
        autoComplete="off"
        placeholder={toPlaceholder(edit.mixed.has(prop), copy.none)}
        onChange={field.handleTextChange}
        onKeyDown={field.handleKeyDown}
        onBlur={field.handleSettle}
      />
      <span
        className={toModifiedClass("ins-swatch", "empty", !hex)}
        style={swatchStyle}
      >
        <input
          type="color"
          aria-label={`${label}${copy.swatchSuffix}`}
          value={hex ?? NEUTRAL_SWATCH}
          onInput={field.handleSwatchInput}
          onChange={field.handleSwatchChange}
        />
      </span>
      <TokenControl prop={prop} label={label} edit={edit} />
    </div>
  );
};

const ColorField = memo(ColorFieldView, isSameField);

export { ColorField };
