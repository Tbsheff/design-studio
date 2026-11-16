import { UiSelect } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type {
  NumberFigure,
  NumberSpacing,
  NumberStyle,
} from "./number-style-model.js";

interface NumberStyleSelectsProps {
  readonly onFigure: (figure: NumberFigure) => void;
  readonly onSpacing: (spacing: NumberSpacing) => void;
  readonly numbers: NumberStyle;
}

const SPACING_OPTIONS = [
  { label: copy.numbersDefault, value: "default" },
  { label: copy.numbersTabular, value: "tabular" },
  {
    label: copy.numbersProportional,
    shortLabel: copy.numbersProportionalShort,
    value: "proportional",
  },
];

const FIGURE_OPTIONS = [
  { label: copy.numbersDefault, value: "default" },
  { label: copy.numbersLining, value: "lining" },
  {
    label: copy.numbersOldstyle,
    shortLabel: copy.numbersOldstyleShort,
    value: "oldstyle",
  },
];

const NumberStyleSelects = ({
  onFigure,
  onSpacing,
  numbers,
}: NumberStyleSelectsProps): ReactElement => {
  const handleSpacing = useCallback(
    (next: string) => {
      onSpacing(next as NumberSpacing);
    },
    [onSpacing]
  );

  const handleFigure = useCallback(
    (next: string) => {
      onFigure(next as NumberFigure);
    },
    [onFigure]
  );

  return (
    <>
      <UiSelect
        aria-label={copy.numberSpacing}
        value={numbers.spacing}
        options={SPACING_OPTIONS}
        onChange={handleSpacing}
      />
      <UiSelect
        aria-label={copy.numberFigure}
        value={numbers.figure}
        options={FIGURE_OPTIONS}
        onChange={handleFigure}
      />
    </>
  );
};

export { NumberStyleSelects };
