import { memo, useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { isSameEditValues } from "./edit-request-model.js";
import { hasTextLine, toItalicNext, toToggledLine } from "./rows-model.js";
import { StyleToggle } from "./style-toggle.js";
import type { DirectEdit } from "./use-direct-edit.js";

const LINE_PROP = "text-decoration-line";

const TextStyleTogglesView = ({
  edit,
}: {
  readonly edit: DirectEdit;
}): ReactElement => {
  const fontStyle = edit.values["font-style"];
  const isItalic = fontStyle === "italic" || fontStyle === "oblique";
  const decoration = edit.values[LINE_PROP];

  const toggleItalic = useCallback((): void => {
    edit.preview({ "font-style": toItalicNext(isItalic) });
    edit.commit();
  }, [edit, isItalic]);

  const toggleUnderline = useCallback((): void => {
    edit.preview({ [LINE_PROP]: toToggledLine(decoration, "underline") });
    edit.commit();
  }, [edit, decoration]);

  const toggleStrike = useCallback((): void => {
    edit.preview({ [LINE_PROP]: toToggledLine(decoration, "line-through") });
    edit.commit();
  }, [edit, decoration]);

  return (
    <fieldset className="ins-field ins-toggles" aria-label={copy.textStyle}>
      <StyleToggle
        glyph="italic"
        isOn={isItalic}
        label={copy.italic}
        onRun={toggleItalic}
      />
      <StyleToggle
        glyph="underline"
        isOn={hasTextLine(decoration, "underline")}
        label={copy.underline}
        onRun={toggleUnderline}
      />
      <StyleToggle
        glyph="strike"
        isOn={hasTextLine(decoration, "line-through")}
        label={copy.strikethrough}
        onRun={toggleStrike}
      />
    </fieldset>
  );
};

const TextStyleToggles = memo(TextStyleTogglesView, (first, second) =>
  isSameEditValues(first.edit, second.edit, ["font-style", LINE_PROP])
);

export { TextStyleToggles };
