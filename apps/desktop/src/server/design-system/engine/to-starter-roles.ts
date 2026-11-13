type StarterRoles = ReadonlyMap<string, string>;

const ROLE_CANDIDATES = {
  accent: ["--accent", "--color-accent"],
  "accent-fg": [
    "--accent-foreground",
    "--color-accent-foreground",
    "--accent-fg",
  ],
  bg: ["--background", "--color-background", "--bg"],
  border: ["--border", "--color-border"],
  fg: ["--foreground", "--color-foreground", "--fg"],
  "fg-muted": ["--muted-foreground", "--color-muted-foreground", "--fg-muted"],
  "font-body": ["--font-body", "--font-sans"],
  "font-display": ["--font-display", "--font-heading"],
  primary: ["--primary", "--color-primary"],
  "primary-fg": [
    "--primary-foreground",
    "--color-primary-foreground",
    "--primary-fg",
  ],
  "radius-lg": ["--radius", "--radius-lg"],
  "radius-md": ["--radius-md", "--radius"],
  surface: ["--card", "--color-card", "--surface"],
} as const satisfies Readonly<Record<string, readonly string[]>>;

const SPACE_STEPS: readonly string[] = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "10",
  "12",
];

const SPACING_UNIT = "--spacing";

const toVar = (name: string): string => `var(${name})`;

const toRoleEntry = (
  known: ReadonlySet<string>,
  role: string,
  candidates: readonly string[]
): readonly [string, string] | null => {
  const match = candidates.find((candidate) => known.has(candidate)) ?? null;

  if (match === null) {
    return null;
  }

  return [role, toVar(match)];
};

const toSpaceEntry = (
  known: ReadonlySet<string>,
  step: string
): readonly [string, string] | null => {
  const role = `space-${step}`;

  if (known.has(`--${role}`)) {
    return [role, toVar(`--${role}`)];
  }

  if (known.has(SPACING_UNIT)) {
    return [role, `calc(${toVar(SPACING_UNIT)} * ${step})`];
  }

  return null;
};

const isEntry = (
  entry: readonly [string, string] | null
): entry is readonly [string, string] => entry !== null;

const toStarterRoles = (names: readonly string[]): StarterRoles => {
  const known = new Set(names);

  const roles = Object.entries(ROLE_CANDIDATES).map(([role, candidates]) =>
    toRoleEntry(known, role, candidates)
  );

  const spaces = SPACE_STEPS.map((step) => toSpaceEntry(known, step));

  return new Map([...roles, ...spaces].filter((entry) => isEntry(entry)));
};

export { toStarterRoles };

export type { StarterRoles };
