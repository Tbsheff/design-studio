const COPY_PNG_EVENT = "studio:copy-png";

interface CopyPngDetail {
  readonly frameId: string | null;
}

export { COPY_PNG_EVENT };

export type { CopyPngDetail };
