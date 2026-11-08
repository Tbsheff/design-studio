import type { AppServerStatus } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy";
import { ServerActionButton } from "./server-action-button";
import type { ServerAction } from "./server-action-button";

interface ServerButtonsProps {
  readonly control: (action: ServerAction) => void;
  readonly managed: boolean;
  readonly state: AppServerStatus["state"];
}

const ServerButtons = ({
  control,
  managed,
  state,
}: ServerButtonsProps): ReactElement | null => {
  if (!managed) {
    if (state === "starting") {
      return null;
    }

    return (
      <ServerActionButton
        action="start"
        isGhost={false}
        control={control}
        label={copy.checkAgain}
      />
    );
  }

  const running = state === "ready";

  return (
    <>
      {state !== "starting" && (
        <ServerActionButton
          action={pick(running, "restart", "start")}
          isGhost={false}
          control={control}
          label={pick(running, "Restart", "Start")}
        />
      )}
      {(running || state === "starting") && (
        <ServerActionButton
          action="stop"
          isGhost
          control={control}
          label={copy.stop}
        />
      )}
    </>
  );
};

export { ServerButtons };
