import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

const SourceItem = ({
  icon,
  label,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
}): ReactElement => (
  <li>
    <Icon name={icon} size={12} />
    <span className="truncate">{label}</span>
  </li>
);

export { SourceItem };
