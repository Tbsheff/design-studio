import { useMemo } from "react";
import type { ReactElement } from "react";

import type { ShiftPart } from "./css-value-model.js";
import { PlainNumberField } from "./plain-number-field.js";
import { toBlur, toWithBlur } from "./shadows-model.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { createProxyEdit } from "./use-proxy-edit.js";

const NO_BLUR = "0";

const BLUR_PART: ShiftPart = {
  key: "blur",
  map: (raw, change) => toWithBlur(raw, change(toBlur(raw) || NO_BLUR)),
};

const LayerBlur = ({ edit }: { readonly edit: DirectEdit }): ReactElement => {
  const { filter } = edit.values;

  const spec = useMemo(() => {
    const blur = createProxyEdit(edit, "width", toBlur(filter), {
      isMixed: null,
      part: BLUR_PART,
      real: ["filter"],
      write: (value) => ({ filter: toWithBlur(filter, value) }),
    });

    return { edit: blur, label: "Layer blur", min: 0, prop: "width" as const };
  }, [edit, filter]);

  return <PlainNumberField id="ins-layer-blur" short="Blur" spec={spec} />;
};

export { LayerBlur };
