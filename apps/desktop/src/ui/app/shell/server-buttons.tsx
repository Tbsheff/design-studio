import type { AppServerStatus } from "../../../shared/actions/_core/contracts";

function ServerButtons({
  state,
  managed,
  control,
}: {
  state: AppServerStatus["state"];
  managed: boolean;
  control: (action: "start" | "stop" | "restart") => void;
}) {
  if (!managed) {
    return state === "starting" ? null : (
      <button
        type="button"
        className="btn small"
        onClick={() => control("start")}
      >
        Check again
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
          Stop
        </button>
      )}
    </>
  );
}

export { ServerButtons };
