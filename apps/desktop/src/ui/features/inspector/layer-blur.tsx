import { useMemo } from "react";
import type { ReactElement } from "react";

import type { ShiftPart } from "./css-values.js";
import { PlainNumberField } from "./number-field.js";
import { proxyEdit } from "./proxy-edit.js";
import { blurOf, withBlur } from "./shadows.js";
import type { DirectEdit } from "./use-direct-edit.js";

const NO_BLUR = "0";

const BLUR_PART: ShiftPart = {
  key: "blur",
  map: (raw, change) => withBlur(raw, change(blurOf(raw) || NO_BLUR)),
};

const LayerBlur = ({ edit }: { readonly edit: DirectEdit }): ReactElement => {
  const { filter } = edit.values;

  const spec = useMemo(() => {
    const blur = proxyEdit(
      edit,
      "width",
      blurOf(filter),
      (value) => ({ filter: withBlur(filter, value) }),
      ["filter"],
      { isMixed: null, part: BLUR_PART }
    );

    return { edit: blur, label: "Layer blur", min: 0, prop: "width" as const };
  }, [edit, filter]);

  return <PlainNumberField id="ins-layer-blur" short="Blur" spec={spec} />;
};

export { LayerBlur };
