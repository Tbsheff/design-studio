import type ts from "typescript-api";

type Ts = typeof ts;

let tsModule: Promise<Ts | null> | null = null;

const importTypeScript = async (): Promise<Ts | null> => {
  try {
    const mod = await import("typescript-api");

    return (mod as { default?: Ts }).default ?? (mod as Ts);
  } catch {
    return null;
  }
};

const loadTypeScript = (): Promise<Ts | null> => {
  tsModule ??= importTypeScript();

  return tsModule;
};

export { loadTypeScript };
