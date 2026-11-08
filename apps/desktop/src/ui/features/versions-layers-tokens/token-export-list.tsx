import type { KeyboardEvent, ReactNode, RefObject } from "react";

import { COPY } from "./copy.js";
import { TokenExportItem } from "./token-export-item.js";
import { TOKEN_EXPORT_OPTIONS } from "./use-token-export.js";
import type { TokenExportFormat } from "./use-token-export.js";

const HIDDEN_STYLE = { visibility: "hidden" } as const;

interface TokenExportListProps {
  readonly menu: RefObject<HTMLDivElement | null>;
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  readonly onPick: (format: TokenExportFormat) => void;
}

const TokenExportList = ({
  menu,
  onKeyDown,
  onPick,
}: TokenExportListProps): ReactNode => (
  <div
    ref={menu}
    className="ui-menu version-menu"
    role="menu"
    tabIndex={-1}
    aria-label={COPY.exportMenuLabel}
    style={HIDDEN_STYLE}
    onKeyDown={onKeyDown}
  >
    {TOKEN_EXPORT_OPTIONS.map((option) => (
      <TokenExportItem key={option.format} option={option} onPick={onPick} />
    ))}
  </div>
);

export { TokenExportList };
