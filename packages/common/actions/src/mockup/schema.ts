import { DEVICE_FRAME_IDS } from "@design-studio/contracts/device-frame";
import { Effect, Schema } from "effect";

import { DirectionIdSchema, FrameIdSchema } from "../_core/ids.js";

const MockupDeviceSchema = Schema.Literals(DEVICE_FRAME_IDS).annotate({
  description:
    "Device bezel: iphone-15, pixel-8, ipad, macbook or browser. The frame is shot at the screen size of this device.",
});

const MockupSchemeSchema = Schema.Literals(["light", "dark"]).annotate({
  description: "light or dark. Sets the bezel and backdrop colors.",
});

const MockupDirectionField = Schema.NullOr(DirectionIdSchema)
  .annotate({
    description: "Direction id. Pass null for the main direction.",
  })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const MockupFrameField = FrameIdSchema.annotate({
  description: "Frame id from canvas_list.",
});

const MockupExportFields = {
  device: MockupDeviceSchema,
  directionId: MockupDirectionField,
  frameId: MockupFrameField,
  scheme: MockupSchemeSchema,
} as const;

const MockupExportResultSchema = Schema.Struct({
  device: MockupDeviceSchema,
  frameId: Schema.String,
  height: Schema.Int,
  path: Schema.String,
  scheme: MockupSchemeSchema,
  width: Schema.Int,
});

type MockupExportResult = typeof MockupExportResultSchema.Type;

export {
  MockupDeviceSchema,
  MockupExportFields,
  MockupExportResultSchema,
  MockupSchemeSchema,
};

export type { MockupExportResult };
