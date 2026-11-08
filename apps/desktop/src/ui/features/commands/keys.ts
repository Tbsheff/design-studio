import { shortcutLabel } from "./deps.js";
import type { KeyId } from "./deps.js";

const MAC_PLATFORM = /mac|iphone|ipad/iu;

const toPlatform = (): string => {
  const agent: Navigator & {
    readonly userAgentData?: { readonly platform?: string };
  } = navigator;

  return agent.userAgentData?.platform ?? agent.userAgent;
};

const IS_MAC =
  typeof navigator !== "undefined" && MAC_PLATFORM.test(toPlatform());

const tipWithKey = (label: string, id: KeyId): string =>
  `${label}  ${shortcutLabel(id, IS_MAC)}`;

export { KeyHint } from "./key-hint.js";

export { IS_MAC, tipWithKey };
