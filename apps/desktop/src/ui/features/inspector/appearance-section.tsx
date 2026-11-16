import type { ReactElement, ReactNode } from "react";

import { AppearanceExtras } from "./appearance-extras.js";
import { AppearanceGrid } from "./appearance-grid.js";
import { copy } from "./copy.js";
import type { DirectEdit } from "./deps.js";
import { InspectorSection } from "./inspector-fields.js";
import type { Extra } from "./simple-model.js";

interface AppearanceSectionProps {
  readonly edit: DirectEdit;
  readonly extras: Set<Extra>;
  readonly fill: ReactNode;
  readonly canAddShadow: boolean;
  readonly onReveal: (extra: Extra) => void;
}

const AppearanceSection = ({
  edit,
  extras,
  fill,
  canAddShadow,
  onReveal,
}: AppearanceSectionProps): ReactElement => (
  <InspectorSection title={copy.appearance}>
    <AppearanceGrid edit={edit} fill={fill} />
    <AppearanceExtras
      edit={edit}
      extras={extras}
      canAddShadow={canAddShadow}
      onReveal={onReveal}
    />
  </InspectorSection>
);

export { AppearanceSection };
