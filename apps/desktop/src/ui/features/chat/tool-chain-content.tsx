import type { ReactElement, ReactNode } from "react";

import { ChainOfThoughtContent } from "../../ai/components/ai/chain-of-thought-content.js";
import { toStyled } from "./styled.js";

const Content = toStyled(ChainOfThoughtContent, "tool-chips");

const ToolChainContent = ({
  children,
}: {
  children: ReactNode;
}): ReactElement => (
  <Content>
    <div className="ml-4 border-l border-border pl-3">{children}</div>
  </Content>
);

export { ToolChainContent };
