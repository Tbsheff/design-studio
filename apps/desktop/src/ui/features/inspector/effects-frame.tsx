import type { ReactElement, ReactNode } from "react";

import { copy } from "./copy.js";
import { InspectorSection } from "./inspector-fields.js";

const EffectsFrame = ({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement => (
  <InspectorSection title={copy.effects}>{children}</InspectorSection>
);

export { EffectsFrame };
