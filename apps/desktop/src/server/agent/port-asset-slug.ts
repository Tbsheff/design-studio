import { portPageSlug } from "@design-studio/contracts/port";

const DYNAMIC_PART = /^\[.+\]$/u;

const GROUP_PART = /^\(.*\)$/u;

const isDynamicPart = (part: string): boolean => DYNAMIC_PART.test(part);

const toAssetSlug = (route: string): string => {
  const parts = route.split("/").filter((part) => part !== "");

  if (!parts.some((part) => isDynamicPart(part))) {
    return portPageSlug(parts.at(-1) ?? "");
  }

  const kept = parts.filter(
    (part) => !isDynamicPart(part) && !GROUP_PART.test(part)
  );

  return portPageSlug(kept.join("-"));
};

export { toAssetSlug };
