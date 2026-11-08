import type { ComponentSchema } from "@design-studio/contracts/props";
import type { ReactElement } from "react";

interface PropsChipProps {
  readonly component: ComponentSchema;
}

const PropsChip = ({ component }: PropsChipProps): ReactElement => (
  <span
    className="prp-chip"
    data-tip={`${component.file}:${component.line}`}
    data-tip-align="end"
  >
    {component.name}
  </span>
);

export { PropsChip };
