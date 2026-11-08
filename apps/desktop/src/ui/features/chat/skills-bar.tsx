import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";

interface SkillsBarProps {
  readonly onCount: number;
  readonly onQuery: (query: string) => void;
  readonly onSetAll: (isOn: boolean) => void;
  readonly query: string;
  readonly total: number;
}

const SkillsBar = ({
  onCount,
  total,
  query,
  onQuery,
  onSetAll,
}: SkillsBarProps): ReactElement => {
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onQuery(event.target.value);
    },
    [onQuery]
  );

  const onAllOn = useCallback((): void => {
    onSetAll(true);
  }, [onSetAll]);

  const onAllOff = useCallback((): void => {
    onSetAll(false);
  }, [onSetAll]);

  return (
    <div className="skills-bar">
      <span className="skills-note" aria-live="polite">
        {onCount}
        {copy.of}
        {total}
        {copy.on}
      </span>
      <input
        aria-label={copy.filterSkills}
        type="search"
        placeholder={copy.filter}
        value={query}
        onChange={onChange}
      />
      <button type="button" className="btn small ghost" onClick={onAllOn}>
        {copy.allOn}
      </button>
      <button type="button" className="btn small ghost" onClick={onAllOff}>
        {copy.allOff}
      </button>
    </div>
  );
};

export { SkillsBar };
