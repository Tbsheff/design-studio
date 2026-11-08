import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { COPY } from "./copy.js";
import { Advanced } from "./nds-advanced.js";
import { DropZone } from "./nds-drop-zone.js";
import { Presets } from "./nds-presets.js";
import { Section } from "./nds-section.js";
import { UrlField } from "./nds-url-field.js";
import type { DraftForm, Patch } from "./new-design-system-values.js";

const BRIEF_MAX = 4000;
const BRIEF_ROWS = 3;

const NdsSources = ({
  form,
  set,
}: {
  form: DraftForm;
  set: (patch: Patch) => void;
}): ReactElement => {
  const typeBrief = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void =>
      set({ brief: event.target.value }),
    [set]
  );

  const pickBase = useCallback(
    (basePackId: string): void => set({ basePackId }),
    [set]
  );

  return (
    <div className="nds-sources">
      <Section title={COPY.titleFilesAndImages} hint={null} isDrop>
        <DropZone form={form} set={set} />
      </Section>
      <Section title={COPY.titleWebsite} hint={COPY.hintWebsite} isDrop={false}>
        <UrlField form={form} set={set} />
      </Section>
      <Section title={COPY.titleBrief} hint={COPY.hintBrief} isDrop={false}>
        <textarea
          aria-label={COPY.labelBrief}
          rows={BRIEF_ROWS}
          maxLength={BRIEF_MAX}
          placeholder={COPY.placeholderCalmPreciseBankingAppFor}
          value={form.brief}
          onChange={typeBrief}
        />
      </Section>
      <Section
        title={COPY.titleStartFrom}
        hint={COPY.hintStartFrom}
        isDrop={false}
      >
        <Presets value={form.basePackId} onChange={pickBase} />
      </Section>
      <Advanced form={form} set={set} />
    </div>
  );
};

export { NdsSources };
