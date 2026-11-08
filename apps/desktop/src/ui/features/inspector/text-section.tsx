import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement, ReactNode } from "react";

import { copy } from "./copy.js";
import type { DirectEdit } from "./deps.js";
import { InspectorSection } from "./inspector-fields.js";
import { TextGrid } from "./text-grid.js";
import type { TokenUi } from "./use-token-snap.js";

interface TextSectionProps {
  readonly edit: DirectEdit;
  readonly ui: TokenUi | null;
  readonly selection: SelectionContext | null;
  readonly textStyle: ReactNode;
}

const TextSection = ({
  edit,
  ui,
  selection,
  textStyle,
}: TextSectionProps): ReactElement => (
  <InspectorSection title={copy.text}>
    <TextGrid edit={edit} ui={ui} selection={selection} textStyle={textStyle} />
  </InspectorSection>
);

export { TextSection };
