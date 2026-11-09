import type { CompiledTokenEntry } from "@design-studio/contracts";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import type { RawToken } from "./token-draft.js";
import { TokenSection } from "./token-section.js";
import type { TokenDraft } from "./use-token-draft.js";

interface Section {
  readonly entries: CompiledTokenEntry[];
  readonly id: string;
  readonly label: string;
}

interface TokensSectionsProps {
  readonly baseOf: (entry: CompiledTokenEntry) => RawToken;
  readonly draft: TokenDraft;
  readonly emptyText: string | null;
  readonly query: string;
  readonly sections: Section[];
  readonly shownOf: (entry: CompiledTokenEntry) => RawToken;
  readonly showDark: boolean;
  readonly swatchFor: (value: string, isDark: boolean) => string;
}

const TokensSections = (props: TokensSectionsProps): ReactNode => (
  <div className="ins-scroll tkp-scroll">
    {props.sections.length === 0 && (
      <p className="ins-empty tkp-empty">
        {props.emptyText ??
          `${COPY.panelNoMatchPrefix}${props.query}${COPY.panelNoMatchSuffix}`}
      </p>
    )}
    {props.sections.map((section) => (
      <TokenSection
        key={section.id}
        baseOf={props.baseOf}
        draft={props.draft}
        entries={section.entries}
        id={section.id}
        label={section.label}
        shownOf={props.shownOf}
        showDark={props.showDark}
        swatchFor={props.swatchFor}
      />
    ))}
  </div>
);

export { TokensSections };
