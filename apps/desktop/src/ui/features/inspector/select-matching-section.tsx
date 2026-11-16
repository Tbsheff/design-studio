import type { MatchKind, SelectionContext } from "@design-studio/contracts";
import { memo, useCallback } from "react";
import type { MutableRefObject, ReactElement } from "react";

import type { PreviewPort } from "../../platform/bridge.js";
import { copy } from "./copy.js";
import { RareSection } from "./rare-section.js";
import { SelectMatchingButton } from "./select-matching-button.js";
import { MATCH_OPTIONS } from "./select-matching-model.js";
import { runMatching, useMatchNote } from "./use-match-note.js";

interface Props {
  readonly selection: SelectionContext[];
  readonly port: MutableRefObject<PreviewPort | null>;
}

const SelectMatchingView = ({
  selection,
  port,
}: Props): ReactElement | null => {
  const note = useMatchNote();
  const selector = selection.at(-1)?.selector ?? null;

  const handlePick = useCallback(
    (by: MatchKind): void => {
      if (port.current && selector !== null) {
        runMatching(port.current, selector, by);
      }
    },
    [port, selector]
  );

  if (selector === null) {
    return null;
  }

  return (
    <RareSection title={copy.selectMatching} aside={null} modifier={null}>
      <fieldset
        className="ins-add-links ins-select-matching"
        aria-label={copy.selectMatching}
      >
        {MATCH_OPTIONS.map((option) => (
          <SelectMatchingButton
            key={option.by}
            option={option}
            onPick={handlePick}
          />
        ))}
      </fieldset>
      {note && <output className="ins-select-matching-note">{note}</output>}
    </RareSection>
  );
};

const SelectMatchingSection = memo(
  SelectMatchingView,
  (first, second) =>
    first.port === second.port &&
    first.selection.length === second.selection.length &&
    first.selection.every((item, index) => item === second.selection[index])
);

export { SelectMatchingSection };
