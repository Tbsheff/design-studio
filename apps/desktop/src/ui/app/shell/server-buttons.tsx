import type { AppServerStatus } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy";

const ServerButtons = ({
  state,
  managed,
  control,
}: {
  state: AppServerStatus["state"];
  managed: boolean;
  control: (action: "start" | "stop" | "restart") => void;
}): ReactElement | null => {
  if (!managed) {
    if (state === "starting") {
      return null;
    }

    return (
      <button
        type="button"
        className="btn small"
        onClick={() => control("start")}
      >
        {copy.checkAgain}
      </button>
    );
  }

  const running = state === "ready";

  return (
    <>
      {state !== "starting" && (
        <button
          type="button"
          className="btn small"
          onClick={() => control(running ? "restart" : "start")}
        >
          {running ? "Restart" : "Start"}
        </button>
      )}
      {(running || state === "starting") && (
        <button
          type="button"
          className="btn small ghost"
          onClick={() => control("stop")}
        >
          {copy.stop}
        </button>
      )}
    </>
  );
};

export { ServerButtons };
