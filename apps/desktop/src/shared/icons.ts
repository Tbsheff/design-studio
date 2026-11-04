const ICON_PACKAGES = [
  "lucide-react",
  "@heroicons/react",
  "@tabler/icons-react",
] as const;

type IconPackage = (typeof ICON_PACKAGES)[number];

const ICON_BUNDLED = "lucide";

const ICON_SOURCES = [ICON_BUNDLED, ...ICON_PACKAGES] as const;

type IconSource = (typeof ICON_SOURCES)[number];

const ICON_POSITIONS = ["inside", "before", "after"] as const;

type IconPosition = (typeof ICON_POSITIONS)[number];

const ICON_LIST_MAX = 50;
const ICON_LIST_DEFAULT = 20;
const ICON_SIZE_DEFAULT = 16;
const ICON_SIZE_MIN = 8;
const ICON_SIZE_MAX = 256;
const ICON_QUERY_MAX = 80;
const ICON_TARGET_MAX = 2000;
const ICON_SOURCE_MAX = 1100;
const ICON_PATH_MAX = 300;
const ICON_NAME = /^[A-Za-z][A-Za-z0-9-]{0,79}$/u;
const ICON_COLOR = /^[a-z][a-z0-9-]{0,63}$/u;

interface IconSummary {
  component: string | null;
  library: IconSource;
  name: string;
  svg: string;
}

interface IconList {
  icons: IconSummary[];
  importFrom: string | null;
  library: IconSource;
  total: number;
}

export {
  ICON_BUNDLED,
  ICON_COLOR,
  ICON_LIST_DEFAULT,
  ICON_LIST_MAX,
  ICON_NAME,
  ICON_PACKAGES,
  ICON_PATH_MAX,
  ICON_POSITIONS,
  ICON_QUERY_MAX,
  ICON_SIZE_DEFAULT,
  ICON_SIZE_MAX,
  ICON_SIZE_MIN,
  ICON_SOURCE_MAX,
  ICON_SOURCES,
  ICON_TARGET_MAX,
};

export type { IconList, IconPackage, IconPosition, IconSource, IconSummary };
