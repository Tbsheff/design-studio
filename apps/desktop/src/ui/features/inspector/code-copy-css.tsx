import type { MutableRefObject, ReactElement } from "react";

import type { PreviewPort } from "../../platform/bridge.js";
import { CopyCssButton } from "./copy-css-button.js";
import { useAuthoredCss } from "./use-authored-css.js";

interface CodeCopyCssProps {
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly selector: string;
}

const CodeCopyCss = ({ port, selector }: CodeCopyCssProps): ReactElement => {
  const authored = useAuthoredCss(port, selector);

  return <CopyCssButton authored={authored} />;
};

export { CodeCopyCss };
