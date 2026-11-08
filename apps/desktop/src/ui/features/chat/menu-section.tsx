import { useId } from "react";
import type { ReactElement, ReactNode } from "react";

import { GROUP_ROLE } from "./aria-role-model.js";

const MenuSection = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): ReactElement => {
  const id = useId();

  return (
    <div className="ui-menu-section" role={GROUP_ROLE} aria-labelledby={id}>
      <span className="ui-menu-label" id={id}>
        {label}
      </span>
      {children}
    </div>
  );
};

export { MenuSection };
