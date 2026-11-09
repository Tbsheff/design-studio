import type { ReactElement } from "react";

import type { LinkAction, PrototypeLink } from "./deps.js";
import { SelectorField } from "./selector-field.js";
import { UrlField } from "./url-field.js";
import type { Interaction } from "./use-link-interaction.js";
import { VariableField } from "./variable-field.js";

interface TargetFieldProps {
  readonly action: LinkAction;
  readonly interaction: Interaction;
  readonly link: PrototypeLink;
  readonly projectId: string;
}

const TargetField = ({
  action,
  interaction,
  link,
  projectId,
}: TargetFieldProps): ReactElement | null => {
  if (action === "set-variable") {
    return (
      <VariableField
        interaction={interaction}
        link={link}
        projectId={projectId}
      />
    );
  }

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
