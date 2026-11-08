import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement, ReactNode } from "react";

import { AlignField } from "./align-field.js";
import { ColorField } from "./color-field.js";
import { copy } from "./copy.js";
import type { DirectEdit } from "./deps.js";
import { ContentRow, TextStyleToggles } from "./inspector-rows.js";
import { FontField } from "./inspector-tokens.js";
import { SelectField } from "./select-field.js";
import {
  CASES,
  FONT_SIZE,
  LETTER_SPACING,
  LINE_HEIGHT,
  WEIGHTS,
} from "./simple-model.js";
import { SpecNumberField } from "./spec-number-field.js";
import type { TokenUi } from "./use-token-snap.js";

interface TextGridProps {
  readonly edit: DirectEdit;
  readonly ui: TokenUi | null;
  readonly selection: SelectionContext | null;
  readonly textStyle: ReactNode;
}

const TextGrid = ({
  edit,
  ui,
  selection,
  textStyle,
}: TextGridProps): ReactElement => (
  <div className="ins-grid">
    {selection && <ContentRow selection={selection} edit={edit} />}
    {textStyle && <div className="wide">{textStyle}</div>}
    <div className="wide">
      <FontField ui={ui} edit={edit} />
    </div>
    <SpecNumberField edit={edit} field={FONT_SIZE} />
    <ColorField prop="color" label="Text color" short="Color" edit={edit} />
    <SelectField
      prop="font-weight"
      label="Font weight"
      short="Weight"
      edit={edit}
      options={WEIGHTS}
    />
    <TextStyleToggles edit={edit} />
    <div className="ins-field ins-align-row">
      <span className="ins-scrub static">{copy.align}</span>
      <AlignField edit={edit} />
    </div>
    <SpecNumberField edit={edit} field={LINE_HEIGHT} />
    <SpecNumberField edit={edit} field={LETTER_SPACING} />
    <SelectField
      prop="text-transform"
      label="Text case"
      short="Case"
      edit={edit}
      options={CASES}
    />
  </div>
);

export { TextGrid };
