import { readFile } from "node:fs/promises";
import path from "node:path";

import { Result, Schema } from "effect";

import { toDecoder } from "../../platform/decode/index.js";

const FLOW_FILE = "flow.json";

const FlowSchema = Schema.Struct({
  params: Schema.Record(Schema.String, Schema.String),
});

const toFlowFile = toDecoder(Schema.fromJsonString(FlowSchema), "ignore");

const getFlowText = async (projectDir: string): Promise<string | null> => {
  try {
    return await readFile(path.join(projectDir, FLOW_FILE), "utf-8");
  } catch {
    return null;
  }
};

const getSavedParams = async (
  projectDir: string
): Promise<Readonly<Record<string, string>>> => {
  const text = await getFlowText(projectDir);

  if (text === null) {
    return {};
  }

  const decoded = toFlowFile(text);

  if (Result.isFailure(decoded)) {
    return {};
  }

  return decoded.success.params;
};

export { getSavedParams };
