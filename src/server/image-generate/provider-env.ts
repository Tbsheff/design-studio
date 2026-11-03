type ImageProviderName = "gemini" | "mock" | "openai";

interface ProviderChoice {
  readonly key: string;
  readonly name: ImageProviderName;
}

const REAL = new Set<string>(["gemini", "openai"]);

const readProvider = (): ImageProviderName => {
  const raw = (process.env.STUDIO_IMAGE_PROVIDER ?? "").trim().toLowerCase();

  if (REAL.has(raw)) {
    return raw as ImageProviderName;
  }

  return "mock";
};

const readKey = (): string => (process.env.STUDIO_IMAGE_KEY ?? "").trim();

const readChoice = (): ProviderChoice => ({
  key: readKey(),
  name: readProvider(),
});

const NO_KEY =
  "The image provider needs a key. Set STUDIO_IMAGE_KEY in the studio settings, or set STUDIO_IMAGE_PROVIDER=mock.";

const messageOf = (choice: ProviderChoice): string | null => {
  if (choice.name === "mock") {
    return null;
  }

  if (choice.key === "") {
    return NO_KEY;
  }

  return null;
};

export { messageOf, NO_KEY, readChoice };

export type { ImageProviderName, ProviderChoice };
