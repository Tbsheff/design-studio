import { useCallback } from "react";
import type { ReactNode } from "react";

import { ColorValue, DimensionValue, TextValue } from "./token-inputs.js";
import type { TokenRowProps } from "./token-row-types.js";

type TokenValueEditorProps = Pick<
  TokenRowProps,
  "entry" | "error" | "onEdit" | "shown" | "swatchFor"
>;

const toUnitLabel = (path: string): string => {
  switch (path.split(".")[0]) {
    case "radius": {
      return "R";
    }

    case "space": {
      return "SP";
    }

    case "text": {
      return "Aa";
    }

    default: {
      return "D";
    }
  }
};

const TokenValueEditor = ({
  entry,
  error,
  onEdit,
  shown,
  swatchFor,
}: TokenValueEditorProps): ReactNode => {
  const label = `${entry.cssVar} value`;
  const invalid = Boolean(error);

  const handleValueEdit = useCallback(
    (next: string): void => {
      onEdit(entry, "value", next);
    },
    [entry, onEdit]
  );

  if (entry.type === "color") {
    return (
      <ColorValue
        label={label}
        value={shown.value}
        invalid={invalid}
        swatch={swatchFor(shown.value, false)}
        onChange={handleValueEdit}
      />
    );
  }

  if (entry.type === "dimension") {
    return (
      <DimensionValue
        id={`tkp-${entry.path}`}
        label={label}
        short={toUnitLabel(entry.path)}
        value={shown.value}
        invalid={invalid}
        onChange={handleValueEdit}
      />
    );
  }

  return (
    <TextValue
      label={label}
      value={shown.value}
      invalid={invalid}
      mono={entry.type === "shadow"}
      onChange={handleValueEdit}
    />
  );
};

export { TokenValueEditor };
