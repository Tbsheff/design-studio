import type { Schema } from "effect";

import type { StudioError } from "./errors/all.js";

type WireData = Readonly<Record<string, Schema.Json>>;

interface WireBody {
  readonly _tag: string;
  readonly code: string | null;
  readonly error: string;
  readonly message: string;
}

interface Coded {
  readonly code: string;
  readonly data: WireData;
}

const DEFECT_MESSAGE = "Something went wrong in Design Studio. Try again.";

const isCoded = (error: StudioError): error is StudioError & Coded =>
  "code" in error &&
  typeof error.code === "string" &&
  "data" in error &&
  typeof error.data === "object";

const toWire = (error: StudioError | null): WireBody & WireData => {
  if (error === null) {
    return {
      _tag: "Defect",
      code: null,
      error: "Defect",
      message: DEFECT_MESSAGE,
    };
  }

  if (isCoded(error)) {
    return {
      ...error.data,
      _tag: error._tag,
      code: error.code,
      error: error.code,
      message: error.message,
    };
  }

  return {
    _tag: error._tag,
    code: null,
    error: error._tag,
    message: error.message,
  };
};

export { toWire };

export type { WireBody, WireData };
