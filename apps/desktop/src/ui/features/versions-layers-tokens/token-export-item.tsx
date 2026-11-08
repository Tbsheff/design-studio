import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactNode } from "react";

import type {
  TokenExportFormat,
  TokenExportOption,
} from "./use-token-export.js";

const ICON_SIZE = 14;

interface TokenExportItemProps {
  readonly onPick: (format: TokenExportFormat) => void;
  readonly option: TokenExportOption;
}

const TokenExportItem = ({
  onPick,
  option,
}: TokenExportItemProps): ReactNode => {
  const { format } = option;

  const handlePick = useCallback((): void => {
    onPick(format);
  }, [format, onPick]);

  return (
    <button
      type="button"
      role="menuitem"
      className="ui-menu-item"
      tabIndex={-1}
      data-testid={`token-export-${format}`}
      onClick={handlePick}
    >
      <Icon name="copy" size={ICON_SIZE} />
      <span>{option.label}</span>
    </button>
  );
};

export { TokenExportItem };
