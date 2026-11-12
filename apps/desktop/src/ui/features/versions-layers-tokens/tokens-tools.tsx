import type { ReactNode } from "react";

import { TokenExportMenu } from "./token-export-menu.js";
import { TokenExportResult } from "./token-export-result.js";
import { TokenUsageChip } from "./token-usage-chip.js";
import { useTokenExport } from "./use-token-export.js";
import type { TokenExportSetup } from "./use-token-export.js";

import styles from "./token-export.module.css";

interface TokensToolsProps {
  readonly isUnusedOnly: boolean;
  readonly onUnusedToggle: () => void;
  readonly setup: TokenExportSetup;
  readonly unusedCount: number | null;
}

const TokensTools = ({
  isUnusedOnly,
  onUnusedToggle,
  setup,
  unusedCount,
}: TokensToolsProps): ReactNode => {
  const exporter = useTokenExport(setup);

  return (
    <div className={styles.tools}>
      <div className={styles.row}>
        {unusedCount !== null && (
          <TokenUsageChip
            count={unusedCount}
            isOn={isUnusedOnly}
            onToggle={onUnusedToggle}
          />
        )}
        <TokenExportMenu exporter={exporter} />
      </div>
      {exporter.error !== null && (
        <p className={styles.error} role="alert">
          {exporter.error}
        </p>
      )}
      {exporter.result !== null && (
        <TokenExportResult
          isCopied={exporter.isCopied}
          onCopy={exporter.handleCopy}
          onSave={exporter.handleSave}
          view={exporter.result}
        />
      )}
    </div>
  );
};

export { TokensTools };
