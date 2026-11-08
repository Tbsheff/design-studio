import { PanelHead } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { TokensHeaderEnd } from "./tokens-header-end.js";
import type { ThemeId } from "./tokens-panel-model.js";

interface TokensPanelHeadProps {
  readonly hasSweep: boolean;
  readonly isSweepOpen: boolean;
  readonly onSweepOpen: (update: (open: boolean) => boolean) => void;
  readonly onTheme: (theme: ThemeId) => void;
  readonly sweepLabel: string;
  readonly sweepTip: string;
  readonly theme: ThemeId;
}

const TokensPanelHead = (props: TokensPanelHeadProps): ReactNode => {
  const { onTheme } = props;

  const handleTheme = useCallback(
    (next: ThemeId): void => {
      onTheme(next);
    },
    [onTheme]
  );

  return (
    <PanelHead
      title={COPY.titleTokens}
      rootClassName="ins-header tkp-header"
      titleClassName="tkp-title"
    >
      <TokensHeaderEnd
        hasSweep={props.hasSweep}
        isSweepOpen={props.isSweepOpen}
        sweepLabel={props.sweepLabel}
        sweepTip={props.sweepTip}
        theme={props.theme}
        onSweepOpen={props.onSweepOpen}
        onTheme={handleTheme}
      />
    </PanelHead>
  );
};

export { TokensPanelHead };
