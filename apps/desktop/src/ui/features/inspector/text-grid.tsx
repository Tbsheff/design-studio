import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement, ReactNode } from "react";

import { AlignField } from "./align-field.js";
import { ColorField } from "./color-field.js";
import { ContentRow } from "./content-row.js";
import type { DirectEdit } from "./deps.js";
import type { ElementClasses } from "./element-classes-model.js";
import { FontField } from "./font-field.js";
import { GlyphNumberField } from "./glyph-number-field.js";
import { NumberStyleRow } from "./number-style-row.js";
import { SelectField } from "./select-field.js";
import {
  CASES,
  FONT_SIZE,
  LETTER_SPACING,
  LINE_HEIGHT,
  WEIGHTS,
} from "./simple-model.js";
import { SpecNumberField } from "./spec-number-field.js";
import { TextStyleToggles } from "./text-style-toggles.js";
import { TextWrapRow } from "./text-wrap-row.js";
import { TruncateRow } from "./truncate-row.js";
import type { TokenUi } from "./use-token-snap.js";

interface TextGridProps {
  readonly edit: DirectEdit;
  readonly ui: TokenUi | null;
  readonly selection: SelectionContext | null;
  readonly classes: ElementClasses | null;
  readonly textStyle: ReactNode;
}

const TextGrid = ({
  edit,
  ui,
  selection,
  classes,
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
      <AlignField edit={edit} />
    </div>
    <GlyphNumberField edit={edit} field={LINE_HEIGHT} glyph="leading" />
    <GlyphNumberField edit={edit} field={LETTER_SPACING} glyph="tracking" />
    <SelectField
      prop="text-transform"
      label="Text case"
      short="Case"
      edit={edit}
      options={CASES}
    />
    {selection && classes && (
      <TruncateRow edit={edit} selection={selection} classes={classes} />
    )}
    <NumberStyleRow edit={edit} selection={selection} classes={classes} />
    <TextWrapRow edit={edit} selection={selection} classes={classes} />
  </div>
);

export { TextGrid };
