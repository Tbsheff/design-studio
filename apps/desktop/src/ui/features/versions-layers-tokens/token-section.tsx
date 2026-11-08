import type { CompiledTokenEntry } from "@design-studio/contracts";
import type { ReactNode } from "react";

import type { PendingToken, RawToken } from "./token-draft.js";
import { TokenRow } from "./token-row.js";
import type { TokenDraft } from "./use-token-draft.js";

interface TokenSectionProps {
  readonly baseOf: (entry: CompiledTokenEntry) => RawToken;
  readonly draft: TokenDraft;
  readonly entries: CompiledTokenEntry[];
  readonly id: string;
  readonly label: string;
  readonly shownOf: (entry: CompiledTokenEntry) => RawToken;
  readonly showDark: boolean;
  readonly swatchFor: (value: string, isDark: boolean) => string;
}

const toPending = (draft: TokenDraft, path: string): PendingToken | undefined =>
  draft.pending[path];

const TokenSection = (props: TokenSectionProps): ReactNode => {
  const { baseOf, draft, entries, id, label, shownOf } = props;
  const headingId = `tkp-sec-${id}`;
  const { edit: handleEdit, revert: handleRevert } = draft;

  return (
    <section className="tkp-section" aria-labelledby={headingId}>
      <h3 className="tkp-section-head" id={headingId}>
        {label}
        <span className="tkp-section-count">{entries.length}</span>
      </h3>
      <ul className="tkp-list">
        {entries.map((entry) => (
          <TokenRow
            key={entry.path}
            entry={entry}
            shown={shownOf(entry)}
            base={baseOf(entry)}
            pending={toPending(draft, entry.path)}
            error={draft.errors[entry.path]}
            showDark={props.showDark}
            swatchFor={props.swatchFor}
            onEdit={handleEdit}
            onRevert={handleRevert}
          />
        ))}
      </ul>
    </section>
  );
};

export { TokenSection };
