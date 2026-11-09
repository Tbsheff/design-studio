interface MockupPalette {
  readonly body: string;
  readonly chrome: string;
  readonly edge: string;
  readonly lens: string;
  readonly stage: string;
  readonly urlField: string;
}

type MockupScheme = "dark" | "light";

const LIGHT_PALETTE: MockupPalette = {
  body: "#d8d9de",
  chrome: "#e9e9ee",
  edge: "#b4b5bc",
  lens: "#0b0b0c",
  stage: "#f2f2f4",
  urlField: "#ffffff",
};

const DARK_PALETTE: MockupPalette = {
  body: "#1a1a1d",
  chrome: "#26262b",
  edge: "#3a3a3f",
  lens: "#000000",
  stage: "#0e0e10",
  urlField: "#121214",
};

const toMockupPalette = (scheme: MockupScheme): MockupPalette => {
  if (scheme === "dark") {
    return DARK_PALETTE;
  }

  return LIGHT_PALETTE;
};

export { toMockupPalette };

export type { MockupPalette, MockupScheme };
