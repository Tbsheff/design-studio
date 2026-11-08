import { useCallback, useState } from "react";
import type { ReactElement, ReactNode } from "react";

import { DisclosureLabel } from "./disclosure-label.js";
import { Icon } from "./icon.js";

const DATA_DISCLOSURE =
  "Prompts, selected element code, attached images and project files the agent reads are sent to Anthropic's API to generate designs. Projects, versions and history stay on this computer.";

const COPY = {
  hide: "Hide data use details",
  show: "Show data use details",
} as const;

const LOCK_SIZE = 13;

const toToggleLabel = (isOpen: boolean): string => {
  if (isOpen) {
    return COPY.hide;
  }

  return COPY.show;
};

const toLineClass = (isOpen: boolean, className: string): string => {
  const state = [];

  if (isOpen) {
    state.push("open");
  }

  return `disclosure-line ${state.join("")} ${className}`;
};

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
  const toggle = useCallback(() => setOpen((isOpen) => !isOpen), []);

  return (
    <div className={toLineClass(open, className)}>
      {lead}
      <Icon name="lock" size={LOCK_SIZE} />
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
        aria-label={toToggleLabel(open)}
        onClick={toggle}
      >
        <DisclosureLabel isOpen={open} />
      </button>
      {trail}
    </div>
  );
};
