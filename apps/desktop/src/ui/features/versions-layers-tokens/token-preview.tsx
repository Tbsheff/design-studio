import type { CompiledTokenEntry } from "@design-studio/contracts";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { modeValue } from "../../../shared/token-match.js";
import type { TokenMode } from "../../../shared/token-match.js";
import { COPY } from "./copy.js";
import { toBarWidth } from "./token-picker-model.js";
import { TokenValueSwatch } from "./token-value-swatch.js";

interface TokenPreviewProps {
  readonly entry: CompiledTokenEntry;
  readonly mode: TokenMode;
}

const TokenPreview = ({ entry, mode }: TokenPreviewProps): ReactNode => {
  const value = modeValue(entry, mode);
  const glyphStyle = useMemo(() => ({ fontFamily: value }), [value]);

  const barStyle = useMemo(
    () => ({ width: `${toBarWidth(value)}px` }),
    [value]
  );

  if (entry.type === "color") {
    return <TokenValueSwatch paint={value} isSmall={false} />;
  }

  if (entry.type === "fontFamily") {
    return (
      <span className="tk-glyph" style={glyphStyle} aria-hidden="true">
        {COPY.pickerGlyph}
      </span>
    );
  }

  return (
    <span className="tk-bar-wrap" aria-hidden="true">
      <span className="tk-bar" style={barStyle} />
    </span>
  );
};

export { TokenPreview };
