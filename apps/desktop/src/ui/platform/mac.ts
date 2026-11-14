const MAC_PLATFORM = /mac|iphone|ipad/iu;

const toPlatform = (): string => {
  const agent: Navigator & {
    readonly userAgentData?: { readonly platform?: string };
  } = navigator;

  return agent.userAgentData?.platform ?? agent.userAgent;
};

const isMacPlatform = (): boolean =>
  typeof navigator !== "undefined" && MAC_PLATFORM.test(toPlatform());

export { isMacPlatform };
