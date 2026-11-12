import type { KeyboardEvent, ReactNode, RefObject } from "react";

import { COPY } from "./copy.js";
import { TokenSweepItem } from "./token-sweep-item.js";
import { TokenThemeGroup } from "./token-theme-group.js";
import type { ThemeId } from "./tokens-panel-model.js";

import styles from "./token-rename.module.css";

const HIDDEN_STYLE = { visibility: "hidden" } as const;

interface TokensViewMenuProps {
  readonly hasSweep: boolean;
  readonly isSweepOpen: boolean;
  readonly menu: RefObject<HTMLDivElement | null>;
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  readonly onSweep: () => void;
  readonly onTheme: (theme: ThemeId) => void;
  readonly sweepLabel: string;
  readonly sweepTip: string;
  readonly theme: ThemeId;
}

const TokensViewMenu = ({ menu, ...props }: TokensViewMenuProps): ReactNode => (
  <div
    ref={menu}
    className={`ui-menu ${styles.menu}`}
    role="menu"
    tabIndex={-1}
    aria-label={COPY.labelViewMenu}
    style={HIDDEN_STYLE}
    onKeyDown={props.onKeyDown}
  >
    <TokenThemeGroup theme={props.theme} onTheme={props.onTheme} />
    {props.hasSweep && (
      <TokenSweepItem
        isOn={props.isSweepOpen}
        label={props.sweepLabel}
        tip={props.sweepTip}
        onToggle={props.onSweep}
      />
    )}
  </div>
);

export { TokensViewMenu };
