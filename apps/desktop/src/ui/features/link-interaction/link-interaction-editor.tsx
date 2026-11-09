import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { UiSelect } from "./deps.js";
import { actionOptions, shownAction } from "./interaction-model.js";
import { PlacementField } from "./placement-field.js";
import { TargetField } from "./target-field.js";
import { TriggerField } from "./trigger-field.js";
import { useLinkInteraction } from "./use-link-interaction.js";
import type { InteractionHost } from "./use-link-interaction.js";
import { WhenField } from "./when-field.js";

type LinkInteractionEditorProps = InteractionHost;

const LinkInteractionEditor = (
  props: LinkInteractionEditorProps
): ReactElement => {
  const interaction = useLinkInteraction(props);
  const action = shownAction(props.link, interaction.pending);

  return (
    <span
      aria-busy={interaction.isSaving}
      className="proto-interaction"
      data-testid="link-interaction"
    >
      <TriggerField interaction={interaction} link={props.link} />
      <UiSelect
        aria-label={copy.action}
        options={actionOptions}
        value={action}
        onChange={interaction.handleAction}
      />
      <TargetField
        action={action}
        interaction={interaction}
        link={props.link}
        projectId={props.projectId}
      />
      {action === "popover" && (
        <PlacementField interaction={interaction} link={props.link} />
      )}
      <WhenField
        interaction={interaction}
        link={props.link}
        projectId={props.projectId}
      />
    </span>
  );
};

export { LinkInteractionEditor };

export type { LinkInteractionEditorProps };
