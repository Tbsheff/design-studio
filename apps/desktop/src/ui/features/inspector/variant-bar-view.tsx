import { memo } from "react";
import type { MutableRefObject, ReactElement } from "react";

import type { VariantSupport } from "../../../shared/variants.js";
import type { PreviewPort } from "../../platform/bridge.js";
import { copy } from "./copy.js";
import { useVariantBar } from "./use-variant-bar.js";
import {
  DARK_CHIP,
  STATES,
  toStateTip,
  toSummary,
  toWidthOptions,
  ANY_WIDTH,
} from "./variant-bar-model.js";
import { VariantChip } from "./variant-chip.js";
import { VariantNote } from "./variant-note.js";
import { VariantWidthSelect } from "./variant-width-select.js";

interface Props {
  readonly selector: string;
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly support: VariantSupport | null;
  readonly quietNote: string | null;
}

const VariantBarViewBase = ({
  selector,
  port,
  support,
  quietNote,
}: Props): ReactElement | null => {
  const bar = useVariantBar(selector, port, support);
  const note = toSummary(bar.prefix, support);

  if (support?.mode === "none") {
    if (note === quietNote) {
      return null;
    }

    return <p className="ins-variant-note ins-variants-off">{note}</p>;
  }

  return (
    <fieldset className="ins-variants" aria-label={copy.breakpointAndState}>
      <div className="ins-variant-row">
        <VariantWidthSelect
          value={bar.current.breakpoint ?? ANY_WIDTH}
          options={toWidthOptions(bar.breakpoints)}
          onChange={bar.handleWidth}
        />
        <span className="ins-variant-sep" aria-hidden="true" />
        {STATES.map((state) => (
          <VariantChip
            key={state.id}
            id={state.id}
            label={state.label}
            isPressed={bar.current.states.includes(state.id)}
            tip={toStateTip(state)}
            onToggle={bar.handleState}
          />
        ))}
        <VariantChip
          id={DARK_CHIP}
          label="Dark"
          isPressed={bar.current.dark}
          tip="Dark mode. The frame shows the dark theme"
          onToggle={bar.handleDark}
        />
      </div>
      {bar.prefix !== "" && (
        <VariantNote prefix={bar.prefix} note={note} onBase={bar.handleBase} />
      )}
    </fieldset>
  );
};

const VariantBarView = memo(VariantBarViewBase);

export { VariantBarView };
