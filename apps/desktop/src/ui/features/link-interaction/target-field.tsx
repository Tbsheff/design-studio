import type { ReactElement } from "react";

import type { LinkAction, PrototypeLink } from "./deps.js";
import { SelectorField } from "./selector-field.js";
import { UrlField } from "./url-field.js";
import type { Interaction } from "./use-link-interaction.js";

interface TargetFieldProps {
  readonly action: LinkAction;
  readonly interaction: Interaction;
  readonly link: PrototypeLink;
}

const TargetField = ({
  action,
  interaction,
  link,
}: TargetFieldProps): ReactElement | null => {
  if (action === "open-url") {
    return <UrlField interaction={interaction} link={link} />;
  }

  if (action === "scroll-to" || action === "toggle") {
    return (
      <SelectorField action={action} interaction={interaction} link={link} />
    );
  }

  return null;
};

export { TargetField };

export type { TargetFieldProps };
