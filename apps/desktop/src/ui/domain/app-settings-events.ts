const APP_SETTINGS_EVENT = "studio:app-settings";

const openAppSettings = (): void => {
  globalThis.dispatchEvent(new CustomEvent(APP_SETTINGS_EVENT));
};

export { APP_SETTINGS_EVENT, openAppSettings };
