const STUDIO_TOKEN_PATTERN = /__studio_token=[^"'&\s]*/gu;
const JWT_PATTERN = /eyJ[\w-]+\.[\w-]+\.[\w-]+/gu;
const MCP_KEY_PATTERN = /ds_mcp_[\w-]+/gu;

const REDACTED = "[redacted]";

const toScrubbedText = (text: string): string =>
  text
    .replaceAll(STUDIO_TOKEN_PATTERN, `__studio_token=${REDACTED}`)
    .replaceAll(JWT_PATTERN, REDACTED)
    .replaceAll(MCP_KEY_PATTERN, REDACTED);

const toScrubbedBuffer = (buffer: Buffer): Buffer =>
  Buffer.from(toScrubbedText(buffer.toString("latin1")), "latin1");

export { toScrubbedBuffer, toScrubbedText };
