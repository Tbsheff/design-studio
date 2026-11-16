import { useMemo } from "react";
import type { ReactElement } from "react";

import type { DirectEdit } from "./deps.js";
import { FieldGlyph } from "./field-glyph.js";
import type { FieldGlyphKind } from "./field-glyph.js";
import { NumberField } from "./number-field.js";
import type { NumberFieldConfig } from "./simple-model.js";

interface GlyphNumberFieldProps {
  readonly edit: DirectEdit;
  readonly field: NumberFieldConfig;
  readonly glyph: FieldGlyphKind;
}

const GlyphNumberField = ({
  edit,
  field,
  glyph,
}: GlyphNumberFieldProps): ReactElement => {
  const spec = useMemo(() => ({ ...field.spec, edit }), [field, edit]);

  const icon = useMemo(
    () => <FieldGlyph kind={glyph} tip={field.spec.label} />,
    [glyph, field]
  );

  return <NumberField short={field.short} spec={spec} icon={icon} />;
};

export { GlyphNumberField };
