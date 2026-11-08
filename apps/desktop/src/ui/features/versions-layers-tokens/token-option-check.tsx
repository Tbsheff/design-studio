import { Icon } from "@design-studio/ui";
import type { ReactNode } from "react";

const CHECK_SIZE = 12;

interface CheckProps {
  readonly isShown: boolean;
}

const TokenOptionCheck = ({ isShown }: CheckProps): ReactNode => (
  <span className="tk-check" aria-hidden="true">
    {isShown && <Icon name="check" size={CHECK_SIZE} />}
  </span>
);

export { TokenOptionCheck };
