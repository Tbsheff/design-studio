import type { WireInput } from "@design-studio/actions/_core/action";
import type { createDraftPack } from "@design-studio/actions/pack/create-draft";
import { routes } from "@design-studio/actions/pack/routes";
import type {
  ApplyPackResult,
  DesignSystemCheckResult,
  DesignSystemDraftInfo,
  DesignSystemDraftResult,
  ImportPackMode,
  ImportPackResult,
  OpenPackEditorResult,
  PackDetail,
  PackProblem,
  PackSummary,
  SavePackResult,
} from "@design-studio/contracts";

import { call } from "./http";

const getPack = async (packId: string): Promise<PackDetail> =>
  (await call(routes.getPackPack, {
    packId,
  })) as PackDetail;

const checkPack = async (packId: string): Promise<DesignSystemCheckResult> =>
  (await call(routes.inspectPackPack, {
    packId,
  })) as DesignSystemCheckResult;

const getDesignSystemDraft = async (
  projectId: string
): Promise<DesignSystemDraftInfo> =>
  (await call(routes.getDraftPack, {
    projectId,
  })) as DesignSystemDraftInfo;

const LIST_LIMIT = 200;

const BASE64_CHUNK = 0x80_00;

const toBase64 = async (file: Blob): Promise<string> => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const parts: string[] = [];

  for (let start = 0; start < bytes.length; start += BASE64_CHUNK) {
    parts.push(
      String.fromCodePoint(...bytes.subarray(start, start + BASE64_CHUNK))
    );
  }

  return btoa(parts.join(""));
};

const fromBase64 = (content: string, type: string): Blob =>
  new Blob(
    [Uint8Array.from(atob(content), (char) => char.codePointAt(0) ?? 0)],
    {
      type,
    }
  );

const listPacks = async (): Promise<PackSummary[]> => {
  const page = await call(routes.listSummaryPack, {
    cursor: null,
    limit: LIST_LIMIT,
  });

  return page.items as PackSummary[];
};

const packProblems = async (): Promise<PackProblem[]> => {
  const page = await call(routes.listProblemPack, {
    cursor: null,
    limit: LIST_LIMIT,
  });

  return page.items as PackProblem[];
};

const renamePack = async (packId: string, name: string): Promise<PackSummary> =>
  (await call(routes.updatePackPack, {
    name,
    packId,
  })) as PackSummary;

const duplicatePack = async (
  packId: string,
  name?: string
): Promise<PackSummary> => {
  if (name) {
    return (await call(routes.duplicatePackPack, {
      name,
      packId,
    })) as PackSummary;
  }

  return (await call(routes.duplicatePackPack, {
    packId,
  })) as PackSummary;
};

const deletePack = async (packId: string): Promise<{ ok: true }> =>
  (await call(routes.deletePackPack, {
    packId,
  })) as { ok: true };

const exportPack = async (packId: string): Promise<Blob> => {
  const file = await call(routes.exportPackPack, {
    packId,
  });

  return fromBase64(file.content, file.type);
};

const importPack = async (
  file: File,
  mode: ImportPackMode = "ask"
): Promise<ImportPackResult> =>
  (await call(routes.importPackPack, {
    content: await toBase64(file),
    mode,
  })) as ImportPackResult;

const openPackEditor = async (packId: string): Promise<OpenPackEditorResult> =>
  (await call(routes.startEditorPack, {
    packId,
  })) as OpenPackEditorResult;

const applyPack = async (
  projectId: string,
  directionId: string,
  packId: string
): Promise<ApplyPackResult> =>
  (await call(routes.applyPackPack, {
    directionId,
    packId,
    projectId,
  })) as ApplyPackResult;

const savePack = async (
  projectId: string,
  directionId: string,
  input: { name: string; packId?: string; asNew?: boolean; force?: boolean }
): Promise<SavePackResult> =>
  (await call(routes.setPackPack, {
    ...input,
    directionId,
    projectId,
  })) as SavePackResult;

type DraftWire = WireInput<typeof createDraftPack>;

type DraftRequestWire = Omit<DraftWire, "images" | "improve" | "tokensUpload">;

interface ImageWire {
  readonly content: string;
  readonly mime: string;
  readonly name: string;
}

interface TokensWire {
  readonly name: string;
  readonly text: string;
}

const toImage = async (image: File): Promise<ImageWire> => ({
  content: await toBase64(image),
  mime: image.type,
  name: image.name,
});

const toImages = (form: FormData): Promise<ImageWire[]> => {
  const files: File[] = [];

  for (const value of form.getAll("images")) {
    if (value instanceof File) {
      files.push(value);
    }
  }

  return Promise.all(files.map((file) => toImage(file)));
};

const toTokensUpload = async (form: FormData): Promise<TokensWire | null> => {
  const file = form.get("tokensFile");

  if (!(file instanceof File)) {
    return null;
  }

  return { name: file.name, text: await file.text() };
};

const toRequest = (form: FormData): DraftRequestWire => {
  const request: DraftRequestWire = JSON.parse(
    String(form.get("request") ?? "{}")
  );

  return request;
};

const withTokens = (input: DraftWire, upload: TokensWire | null): DraftWire => {
  if (upload === null) {
    return input;
  }

  return { ...input, tokensUpload: upload };
};

const createDesignSystemDraft = async (
  form: FormData
): Promise<DesignSystemDraftResult> => {
  const [images, upload] = await Promise.all([
    toImages(form),
    toTokensUpload(form),
  ]);

  const input = withTokens(
    { ...toRequest(form), images, improve: true },
    upload
  );

  const result = await call(routes.createDraftPack, input);

  return result as DesignSystemDraftResult;
};

const packApi = {
  applyPack,
  checkPack,
  createDesignSystemDraft,
  deletePack,
  duplicatePack,
  exportPack,
  getDesignSystemDraft,
  getPack,
  importPack,
  listPacks,
  openPackEditor,
  packProblems,
  renamePack,
  savePack,
};

export { packApi };
