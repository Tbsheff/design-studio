const DEFAULT_BASE = "modern-minimal";

type Mode = "auto" | "light" | "dark";

type DesignMdView = "edit" | "preview";

interface DraftForm {
  name: string;
  mode: Mode;
  basePackId: string;
  urls: string[];
  urlInput: string;
  designMd: string;
  designMdFile: string | null;
  brief: string;
  tokensFile: File | null;
  folder: string;
  images: File[];
}

const EMPTY: DraftForm = {
  basePackId: DEFAULT_BASE,
  brief: "",
  designMd: "",
  designMdFile: null,
  folder: "",
  images: [],
  mode: "auto",
  name: "",
  tokensFile: null,
  urlInput: "",
  urls: [],
};

const MAX_URLS = 3;

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

const DROP_ACCEPT = `${IMAGE_TYPES.join(",")},.json,application/json,.css,text/css,.md,.markdown,text/markdown`;

const MAX_IMAGES = 8;

type Patch = Partial<DraftForm>;

export { DROP_ACCEPT, EMPTY, IMAGE_TYPES, MAX_IMAGES, MAX_URLS };

export type { DesignMdView, DraftForm, Mode, Patch };
