import { Icon } from "@design-studio/ui";
import type { ReactNode } from "react";

const SOURCE_ICON_SIZE = 12;

interface TokensSourceProps {
  readonly darkTokens: number;
  readonly declarations: number;
  readonly file: string;
  readonly tokens: number;
}

const TokensSource = (props: TokensSourceProps): ReactNode => (
  <p
    className="tkp-source"
    data-tip={`${props.declarations} declarations, ${props.tokens} tokens, ${props.darkTokens} with a dark value`}
  >
    <Icon name="token" size={SOURCE_ICON_SIZE} />
    <span className="truncate">{`From ${props.file}`}</span>
  </p>
);

export { TokensSource };
