import { useState } from "react";
import type { ReactElement, ReactNode } from "react";

import { Icon } from "./Icon";

const DATA_DISCLOSURE =
  "Prompts, selected element code, attached images and project files the agent reads are sent to Anthropic's API to generate designs. Projects, versions and history stay on this computer.";

export const Disclosure = ({
  className = "",
  lead,
  trail,
}: {
  className?: string;
  lead?: ReactNode;
  trail?: ReactNode;
}): ReactElement => {
  const [open, setOpen] = useState(false);

  return (
    <div className={`disclosure-line ${open ? "open" : ""} ${className}`}>
      {lead}
      <Icon name="lock" size={13} />
      <p
        className="disclosure"
        data-testid="data-disclosure"
        id="data-disclosure-text"
      >
        {DATA_DISCLOSURE}
      </p>
      <button
        type="button"
        className="link disclosure-toggle"
        aria-expanded={open}
        aria-controls="data-disclosure-text"
        aria-label={open ? "Hide data use details" : "Show data use details"}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        {open ? (
          "Less"
        ) : (
          <>
            <span className="disclosure-toggle-wide">Details</span>
            <span className="disclosure-toggle-narrow">
              <Icon name="lock" size={13} />
              Data use
            </span>
          </>
        )}
      </button>
      {trail}
    </div>
  );
};
