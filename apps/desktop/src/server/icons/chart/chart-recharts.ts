import { readFile } from "node:fs/promises";
import path from "node:path";

interface PackageFields {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly name?: string;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly version?: string;
}

const RANGE_PREFIX = /^[\^~>=<\s]+/u;

const getPackageFields = async (dir: string): Promise<PackageFields | null> => {
  try {
    const raw = await readFile(path.join(dir, "package.json"), "utf-8");

    return JSON.parse(raw) as PackageFields | null;
  } catch {
    return null;
  }
};

const toDeclared = (fields: PackageFields | null): string | null =>
  fields?.dependencies?.["recharts"] ??
  fields?.devDependencies?.["recharts"] ??
  fields?.peerDependencies?.["recharts"] ??
  null;

const inspectInstalled = async (dir: string): Promise<string | null> => {
  const fields = await getPackageFields(
    path.join(dir, "node_modules", "recharts")
  );

  return fields?.version ?? null;
};

const inspectRechartsIn = async (dir: string): Promise<string | null> => {
  const installed = await inspectInstalled(dir);

  if (installed !== null) {
    return installed;
  }

  const declared = toDeclared(await getPackageFields(dir));

  if (declared === null) {
    return null;
  }

  return declared.replace(RANGE_PREFIX, "");
};

const inspectRechartsVersion = async (
  dirs: readonly string[]
): Promise<string | null> => {
  const found = await Promise.all(dirs.map((dir) => inspectRechartsIn(dir)));

  return found.find((version) => version !== null) ?? null;
};

const getPackageName = async (dir: string): Promise<string | null> => {
  const fields = await getPackageFields(dir);

  return fields?.name ?? null;
};

export { getPackageName, inspectRechartsVersion };
