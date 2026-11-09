import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { MockupExportResult } from "@design-studio/actions/mockup/schema";
import { toDeviceOuterSize } from "@design-studio/contracts/device-frame";
import type { DeviceFrameId } from "@design-studio/contracts/device-frame";

import { BadRequestError } from "../../platform/errors/index.js";
import {
  pngDimensions,
  waitForPage,
} from "../../preview/page-capture/index.js";
import type { ExportRuntime } from "../export-core.js";
import { toExportsFolder } from "../export-write.js";
import { toMockupHtml } from "./mockup-html.js";
import type { MockupScheme } from "./mockup-palette.js";

interface MockupRequest {
  readonly device: DeviceFrameId;
  readonly frameId: string;
  readonly pngBase64: string;
  readonly projectId: string;
  readonly scheme: MockupScheme;
}

const toMockupFileName = (request: MockupRequest): string =>
  `${request.frameId}-${request.device}-${request.scheme}.png`;

const toBezelPng = async (
  runtime: ExportRuntime,
  request: MockupRequest,
  workDir: string
): Promise<Buffer> => {
  const { preview } = runtime;

  if (!preview.withPage) {
    throw new BadRequestError("rendering is not available");
  }

  const size = toDeviceOuterSize(request.device);
  const htmlFile = path.join(workDir, "mockup.html");
  const pngFile = path.join(workDir, "mockup.png");
  await writeFile(htmlFile, toMockupHtml(request));

  await preview.withPage(
    pathToFileURL(htmlFile).toString(),
    { height: size.height, scale: 1, width: size.width },
    async (page) => {
      await waitForPage(page);
      await page.screenshot(pngFile, {
        height: size.height,
        width: size.width,
        x: 0,
        y: 0,
      });
    }
  );

  return readFile(pngFile);
};

const runMockupExport = async (
  runtime: ExportRuntime,
  request: MockupRequest
): Promise<MockupExportResult> => {
  const workDir = await mkdtemp(path.join(os.tmpdir(), "studio-mockup-"));

  try {
    const png = await toBezelPng(runtime, request, workDir);

    const folder = path.join(
      toExportsFolder(runtime, request.projectId),
      "mockups"
    );

    const target = path.join(folder, toMockupFileName(request));

    await mkdir(folder, { recursive: true });
    await writeFile(target, png);

    const size = pngDimensions(png);

    return {
      device: request.device,
      frameId: request.frameId,
      height: size.height,
      path: target,
      scheme: request.scheme,
      width: size.width,
    };
  } finally {
    await rm(workDir, { force: true, recursive: true });
  }
};

export { runMockupExport };

export type { MockupRequest };
