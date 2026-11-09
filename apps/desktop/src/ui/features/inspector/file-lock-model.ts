const GLOBS_MAX = 100;

const toFolderGlob = (file: string): string | null => {
  const cut = file.lastIndexOf("/");

  if (cut <= 0) {
    return null;
  }

  return `${file.slice(0, cut)}/**`;
};

const canAddGlob = (globs: readonly string[], glob: string): boolean =>
  !globs.includes(glob) && globs.length < GLOBS_MAX;

const toLockedGlobs = (
  globs: readonly string[],
  glob: string
): readonly string[] => {
  if (!canAddGlob(globs, glob)) {
    return globs;
  }

  return [...globs, glob];
};

const toUnlockedGlobs = (
  globs: readonly string[],
  glob: string
): readonly string[] => globs.filter((entry) => entry !== glob);

export { canAddGlob, toFolderGlob, toLockedGlobs, toUnlockedGlobs };
