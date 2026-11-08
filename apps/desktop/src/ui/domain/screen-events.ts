const SCREEN_CREATE_EVENT = "studio:screen-create";

const SCREEN_DUPLICATE_EVENT = "studio:screen-duplicate";

interface ScreenDuplicateDetail {
  readonly frameId: string | null;
}

export { SCREEN_CREATE_EVENT, SCREEN_DUPLICATE_EVENT };

export type { ScreenDuplicateDetail };
