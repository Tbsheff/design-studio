import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { COPY } from "./copy.js";
import { MarkdownView } from "./markdown-view.js";
import type { DesignMdView } from "./new-design-system-values.js";

const DesignMdBody = ({
  view,
  value,
  onChange,
}: {
  view: DesignMdView;
  value: string;
  onChange: (value: string) => void;
}): ReactElement => {
  const typeValue = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void =>
      onChange(event.target.value),
    [onChange]
  );

  if (view === "edit") {
    return (
      <textarea
        aria-label={COPY.labelDesignMd}
        rows={6}
        placeholder={COPY.placeholderBrand1010ColorPalette}
        value={value}
        onChange={typeValue}
      />
    );
  }

  return (
    <section className="nds-preview" aria-label={COPY.labelDesignMdPreview}>
      {value.trim() && <MarkdownView>{value}</MarkdownView>}
      {!value.trim() && <p className="muted">{COPY.textNothingToPreviewYet}</p>}
    </section>
  );
};

export { DesignMdBody };
