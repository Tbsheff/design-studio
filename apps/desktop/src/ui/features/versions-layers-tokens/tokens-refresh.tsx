import { Button } from "@design-studio/ui";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { useTokenImport } from "./use-token-import.js";
import type { TokenImportSetup } from "./use-token-import.js";

interface TokensRefreshProps {
  readonly setup: TokenImportSetup;
}

const TokensRefresh = ({ setup }: TokensRefreshProps): ReactNode => {
  const importer = useTokenImport(setup);

  return (
    <>
      <Button
        disabledReason={null}
        isLoading={importer.isBusy}
        label={null}
        size="sm"
        tip={COPY.refreshTokensTip}
        variant="ghost"
        onClick={importer.handleRefresh}
      >
        {COPY.refreshTokens}
      </Button>
      {importer.note !== null && (
        <output className="tkp-source-note">{importer.note}</output>
      )}
    </>
  );
};

export { TokensRefresh };
