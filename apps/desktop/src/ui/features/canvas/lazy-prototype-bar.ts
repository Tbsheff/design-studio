import { lazy } from "react";
import type { LazyExoticComponent } from "react";

import type { PrototypeBar as PrototypeBarView } from "./prototype-bar.js";

const PrototypeBar: LazyExoticComponent<typeof PrototypeBarView> = lazy(
  async () => {
    const loaded = await import("./prototype-bar.js");

    return { default: loaded.PrototypeBar };
  }
);

export { PrototypeBar };
