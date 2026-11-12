const HIDDEN_ATTRIBUTE = "data-page-hidden";

const syncHiddenFlag = (): void => {
  document.documentElement.toggleAttribute(
    HIDDEN_ATTRIBUTE,
    document.visibilityState === "hidden"
  );
};

const startMotionGuard = (): void => {
  syncHiddenFlag();
  document.addEventListener("visibilitychange", syncHiddenFlag);
};

export { startMotionGuard };
