import type { ComponentSchema } from "@design-studio/contracts/props";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface PropsKitCaptionProps {
  readonly component: ComponentSchema;
}

const PropsKitCaption = ({ component }: PropsKitCaptionProps): ReactElement => (
  <p className="prp-where" data-tip={`${component.file}:${component.line}`}>
    {copy.kitComponentDefaultProps}
  </p>
);

export { PropsKitCaption };
