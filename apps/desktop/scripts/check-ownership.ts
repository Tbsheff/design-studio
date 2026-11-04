import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { matchesGlob } from "node:path";

type Waves = Record<string, Record<string, string[]>>;

const ROADMAP = new URL("../../../.claude/goal/roadmap.md", import.meta.url);

const readWaves = (): Waves | undefined => {
  if (!existsSync(ROADMAP)) {
    return undefined;
  }

  const text = readFileSync(ROADMAP, "utf-8");
  const appendix = text.slice(text.indexOf("## Appendix A"));
  const json = /```json\n(?<body>[\s\S]*?)\n```/u.exec(appendix)?.groups?.body;

  return json ? JSON.parse(json.replaceAll(/,(\s*[}\]])/gu, "$1")) : undefined;
};

const tracked = () =>
  execFileSync("git", ["ls-files"], { encoding: "utf-8" })
    .split("\n")
    .filter(Boolean);

const owns = (globs: string[], file: string) => {
  const included = globs
    .filter((glob) => !glob.startsWith("!"))
    .some((glob) => glob === file || matchesGlob(file, glob));

  const excluded = globs
    .filter((glob) => glob.startsWith("!"))
    .some((glob) => matchesGlob(file, glob.slice(1)));

  return included && !excluded;
};

const universe = (slices: Record<string, string[]>, files: string[]) => {
  const literals = Object.values(slices)
    .flat()
    .filter((glob) => !/[*{!]/u.test(glob));

  return [...new Set([...files, ...literals])];
};

const overlapsOf = (
  wave: string,
  slices: Record<string, string[]>,
  files: string[]
) =>
  universe(slices, files).flatMap((file) => {
    const owners = Object.entries(slices)
      .filter(([, globs]) => owns(globs, file))
      .map(([name]) => name);

    return owners.length > 1 ? [`${wave} ${file}: ${owners.join(" + ")}`] : [];
  });

const main = () => {
  const waves = readWaves();

  if (!waves) {
    process.stdout.write(
      "check-ownership: no wave table found (.claude/goal/roadmap.md); skipped\n"
    );

    return 0;
  }

  const wanted = process.argv[2];
  const files = tracked();

  const overlaps = Object.entries(waves)
    .filter(([wave]) => !wanted || wave === wanted)
    .flatMap(([wave, slices]) => overlapsOf(wave, slices, files));

  process.stdout.write(
    overlaps.length > 0
      ? `${overlaps.join("\n")}\n`
      : `check-ownership: ${wanted ?? "all waves"}: no overlaps\n`
  );

  return overlaps.length > 0 ? 1 : 0;
};

process.exitCode = main();
