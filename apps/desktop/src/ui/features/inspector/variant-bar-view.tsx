import { memo } from "react";
import type { MutableRefObject, ReactElement } from "react";

import type { VariantSupport } from "../../../shared/variants.js";
import type { PreviewPort } from "../../platform/bridge.js";
import { copy } from "./copy.js";
import { useVariantBar } from "./use-variant-bar.js";
import { toSummary, toWidthOptions, ANY_WIDTH } from "./variant-bar-model.js";
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
    <fieldset className="ins-variants" aria-label={copy.variantWidth}>
      <div className="ins-variant-row">
        <VariantWidthSelect
          value={bar.current.breakpoint ?? ANY_WIDTH}
          options={toWidthOptions(bar.breakpoints)}
          onChange={bar.handleWidth}
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
