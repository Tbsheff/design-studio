import { Schema } from "effect";

const ImageOutputSchema = Schema.Struct({
  data: Schema.String,
  mimeType: Schema.String,
  text: Schema.String,
});

export { ImageOutputSchema };
