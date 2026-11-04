import type { Starter } from "@design-studio/actions/_core/contracts";
import type { Busy } from "./home-model.js";

function StarterRow({
  template,
  busy,
  onOpen,
}: {
  template: { label: string; starter: Starter | null } | null;
  busy: Busy;
  onOpen: (starter: Starter) => void;
}) {
  const starter = template?.starter;

  if (!template || !starter) {
    return null;
  }

  return (
    <div className="home-starter-row">
      <span className="ui-chip">{template.label} starter</span>
      <button
        type="button"
        className="link"
        disabled={busy !== null}
        onClick={() => onOpen(starter)}
      >
        {busy === "starter" ? "Opening…" : "Open it now"}
      </button>
      <span className="home-starter-hint">No agent run, no cost</span>
    </div>
  );
}

export { StarterRow };
