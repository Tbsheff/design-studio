import { Schema } from "effect";

const FONT_SOURCES = [
  "next-font",
  "font-face",
  "token",
  "google-link",
  "pack",
  "system",
] as const;

const FontSourceSchema = Schema.Literals(FONT_SOURCES).annotate({
  description:
    "Where the family comes from: next-font, font-face, token, google-link, pack or system.",
});

const FontSchema = Schema.Struct({
  className: Schema.NullOr(Schema.String).annotate({
    description:
      "The Tailwind class for the token, for example font-mono, or null.",
  }),
  family: Schema.String.annotate({ description: "The font family name." }),
  source: FontSourceSchema,
  stack: Schema.String.annotate({
    description:
      "The font-family value to write, for example var(--font-mono) or 'Fraunces', serif.",
  }),
  token: Schema.NullOr(Schema.String).annotate({
    description: "The font token, for example --font-sans, or null.",
  }),
});

type Font = typeof FontSchema.Type;

type FontSource = typeof FontSourceSchema.Type;

export { FONT_SOURCES, FontSchema, FontSourceSchema };

export type { Font, FontSource };
