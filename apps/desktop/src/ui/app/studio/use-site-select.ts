import type { RefObject } from "react";

import type { PreviewPort } from "../../platform/bridge";

const useSiteSelect =
  (port: RefObject<PreviewPort | null>) =>
  (selector: string): void => {
    port.current?.post({ selector, type: "select-selector" });
  };

export { useSiteSelect };
