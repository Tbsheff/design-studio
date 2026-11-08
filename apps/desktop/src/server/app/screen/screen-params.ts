import { readFile } from "node:fs/promises";
import path from "node:path";

import { Schema } from "effect";

const FLOW_FILE = "flow.json";

const FlowFileSchema = Schema.fromJsonString(
  Schema.Struct({
    params: Schema.Record(Schema.String, Schema.String),
  })
);

const decodeFlowFile = Schema.decodeUnknownOption(FlowFileSchema);

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

  const decoded = decodeFlowFile(text);

  if (decoded._tag === "None") {
    return {};
  }

  return decoded.value.params;
};

export { getSavedParams };
