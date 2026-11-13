import type { AppTokenOrigin, AppTokenSource } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { TokensRefresh } from "./tokens-refresh.js";
import type { TokenImportSetup } from "./use-token-import.js";

const SOURCE_ICON_SIZE = 12;

interface TokensSourceProps {
  readonly setup: TokenImportSetup | null;
  readonly source: AppTokenSource;
}

const toSourceText = (
  file: string,
  origin: AppTokenOrigin | null,
  tokens: number
): string => {
  if (origin === null) {
    return `${COPY.sourceFrom}${file}`;
  }

  return `${COPY.sourceFrom}${origin.appName}${COPY.sourceJoin}${origin.file}${COPY.sourceJoin}${tokens}${COPY.sourceTokensSuffix}`;
};

const toSourceTip = (source: AppTokenSource): string =>
  `${source.declarations}${COPY.sourceTipDeclarations}${source.tokens}${COPY.sourceTipTokens}${source.darkTokens}${COPY.sourceTipDark}`;

const TokensSource = ({ setup, source }: TokensSourceProps): ReactNode => {
  const origin = source.origin ?? null;

  return (
    <div className="tkp-source">
      <p className="tkp-source-line" data-tip={toSourceTip(source)}>
        <Icon name="token" size={SOURCE_ICON_SIZE} />
        <span className="truncate">
          {toSourceText(source.file, origin, source.tokens)}
        </span>
      </p>
      {origin !== null && setup !== null && <TokensRefresh setup={setup} />}
    </div>
  );
};

export { TokensSource };
