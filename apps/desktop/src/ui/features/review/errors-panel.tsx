import { Icon } from "@design-studio/ui";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import type { BuildError } from "../home/use-studio-data.js";
import { copy } from "./copy.js";
import { pick } from "./pick.js";

interface Props {
  errors: BuildError[];
  onSendToAgent: (buildError: BuildError) => void;
  onClear: () => void;
  pane?: string;
}

const DEV_NOISE = [
  /\bduring prerender/iu,
  /\bprerender(ing)?\b.*\b(URL|searchParams|params|headers|cookies)\b/iu,
  /should be awaited before using its properties/iu,
  /\[Fast Refresh\]/u,
  /\[HMR\]/u,
  /Download the React DevTools/iu,
  /\bnext-dev-overlay\b|\b__nextjs_original-stack-frame/u,
];

const isDevNoise = (buildError: BuildError): boolean =>
  buildError.source === "console" &&
  DEV_NOISE.some((pattern) => pattern.test(buildError.message));

const countText = (count: number): string =>
  pick(count === 1, "1 error", `${count} errors`);

const fixPrompt = (buildError: BuildError): string => {
  const where = buildError.file
    ? ` in ${buildError.file}${buildError.line ? `:${buildError.line}` : ""}`
    : "";

  const what =
    buildError.source === "build"
      ? "build error"
      : `${buildError.source} error`;

  return `Fix this ${what}${where}:\n\n${buildError.message}`;
};

const ErrorsChip = ({
  count,
  onOpen,
  onClear,
}: {
  count: number;
  onOpen: () => void;
  onClear: () => void;
}): ReactElement => (
  <div className="errors-chip" role="region" aria-label={copy.previewErrors}>
    <button
      type="button"
      className="errors-chip-open"
      aria-expanded={false}
      data-tip={copy.showTheErrors}
      onClick={onOpen}
    >
      <Icon name="alert" size={14} />
      <span>{countText(count)}</span>
      <Icon name="chevronRight" size={12} />
    </button>
    <button
      type="button"
      className="icon-btn"
      aria-label={copy.clearErrors}
      data-tip={copy.clear}
      data-tip-align="end"
      onClick={onClear}
    >
      <Icon name="close" size={12} />
    </button>
  </div>
);

const ErrorsPanel = ({
  errors,
  onSendToAgent,
  onClear,
  pane,
}: Props): ReactElement | null => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (pane === "design") {
      setOpen(false);
    }
  }, [pane]);
  const shown = errors.filter((buildError) => !isDevNoise(buildError));

  if (shown.length === 0) {
    return null;
  }

  if (!open) {
    return (
      <ErrorsChip
        count={shown.length}
        onOpen={() => setOpen(true)}
        onClear={onClear}
      />
    );
  }

  return (
    <div className="errors" role="region" aria-label={copy.previewErrors}>
      <div className="section-head">
        <button
          type="button"
          className="errors-head"
          aria-expanded
          data-tip={copy.hideTheErrors}
          onClick={() => setOpen(false)}
        >
          <Icon name="alert" size={14} />
          <span>{countText(shown.length)}</span>
          <Icon name="chevronDown" size={12} />
        </button>
        <button className="btn ghost small" onClick={onClear}>
          {copy.clear}
        </button>
      </div>
      <ul className="error-list">
        {shown.map((buildError) => (
          <li key={buildError.id}>
            <div className="row between">
              <span className="badge fail">{buildError.source}</span>
              <button
                className="btn small has-icon"
                onClick={() => onSendToAgent(buildError)}
              >
                <Icon name="sparkle" size={14} />
                {copy.sendToAgent}
              </button>
            </div>
            <div className="mono error-msg">{buildError.message}</div>
            {buildError.file && (
              <div className="mono error-loc">
                {buildError.file}
                {buildError.line ? `:${buildError.line}` : ""}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export { isDevNoise, fixPrompt, ErrorsPanel };
