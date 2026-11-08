import { useCallback } from "react";
import type { ReactNode } from "react";

import { ThemeToggle } from "./theme-toggle.js";
import type { ThemeId } from "./tokens-panel-model.js";

interface TokensHeaderEndProps {
  readonly hasSweep: boolean;
  readonly isSweepOpen: boolean;
  readonly onSweepOpen: (update: (open: boolean) => boolean) => void;
  readonly onTheme: (theme: ThemeId) => void;
  readonly sweepLabel: string;
  readonly sweepTip: string;
  readonly theme: ThemeId;
}

const toggleOpen = (open: boolean): boolean => !open;

const TokensHeaderEnd = (props: TokensHeaderEndProps): ReactNode => {
  const { onSweepOpen } = props;

  const handleSweepToggle = useCallback((): void => {
    onSweepOpen(toggleOpen);
  }, [onSweepOpen]);

  return (
    <div className="ins-header-end">
      {props.hasSweep && (
        <button
          type="button"
          className="btn small ghost"
          aria-expanded={props.isSweepOpen}
          data-tip={props.sweepTip}
          onClick={handleSweepToggle}
        >
          {props.sweepLabel}
        </button>
      )}
      <ThemeToggle theme={props.theme} onTheme={props.onTheme} />
    </div>
  );
};

export { TokensHeaderEnd };
