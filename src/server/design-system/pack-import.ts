import type { CreateUserPackInput, PackManifest, PackSummary } from '../../shared/contracts.js';
import { BadRequestError, ConflictError } from '../store/errors.js';
import { DESIGN_MD_FILE, formatIssues, manifestSchema } from './packs.js';
import { ZipError, unzipFiles } from './zip.js';

export const MAX_IMPORT_ZIP_BYTES = 2 * 1024 * 1024;
const MAX_FILE_BYTES = 512 * 1024;
const PACK_FILES = ['pack.json', 'tokens.json', DESIGN_MD_FILE] as const;
const FOLDER = /^[a-z0-9][a-z0-9-]{0,63}$/;

export type ImportMode = 'ask' | 'replace' | 'copy';

export interface PackZip {
  folderId: string;
  input: CreateUserPackInput;
}

export class PackExistsError extends ConflictError {
  constructor(readonly existing: PackSummary) {
    super(`${existing.name} is already in your library`);
  }
}

export function parseImportMode(value: unknown): ImportMode {
  if (value === undefined || value === null || value === '') return 'ask';
  if (value === 'ask' || value === 'replace' || value === 'copy') return value;
  throw new BadRequestError('mode must be ask, replace or copy');
}

function splitName(name: string): { folder: string; file: string } {
  const parts = name.split('/');
  const [folder, file] = parts;
  if (parts.length !== 2 || !folder || !file || !FOLDER.test(folder) || !(PACK_FILES as readonly string[]).includes(file)) {
    throw new BadRequestError(`unexpected file in the zip: ${name.slice(0, 120)}. A design system zip has only <id>/pack.json, <id>/tokens.json and <id>/DESIGN.md`);
  }
  return { folder, file };
}

function readManifest(text: string): PackManifest {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BadRequestError('pack.json in the zip is not valid JSON');
  }
  const parsed = manifestSchema.safeParse(raw);
  if (!parsed.success) throw new BadRequestError(`invalid pack.json in the zip: ${formatIssues('pack.json', parsed.error).join('; ')}`);
  return parsed.data as PackManifest;
}

export function readPackZip(bytes: Buffer): PackZip {
  if (bytes.length > MAX_IMPORT_ZIP_BYTES) throw new BadRequestError('the zip is larger than 2 MB');
  let entries;
  try {
    entries = unzipFiles(bytes, { maxEntries: PACK_FILES.length, maxEntryBytes: MAX_FILE_BYTES, maxTotalBytes: MAX_FILE_BYTES * PACK_FILES.length });
  } catch (error) {
    if (error instanceof ZipError) throw new BadRequestError(error.message);
    throw error;
  }
  const files = new Map<string, string>();
  let folderId: string | null = null;
  for (const entry of entries) {
    const { folder, file } = splitName(entry.name);
    if (folderId !== null && folder !== folderId) throw new BadRequestError('the zip must hold one design system folder');
    folderId = folder;
    files.set(file, entry.data.toString('utf8'));
  }
  const missing = PACK_FILES.filter((file) => !files.has(file));
  if (folderId === null || missing.length > 0) throw new BadRequestError(`the zip has no ${missing.join(', ')}`);
  const manifest = readManifest(files.get('pack.json') ?? '');
  return {
    folderId,
    input: {
      name: manifest.name,
      description: manifest.description,
      mode: manifest.mode,
      fonts: manifest.fonts,
      tokensJson: files.get('tokens.json') ?? '',
      designMd: files.get(DESIGN_MD_FILE) ?? '',
      provenance: 'imported',
      tags: manifest.tags,
      license: manifest.license,
      draft: false,
    },
  };
}

export function findImportConflict(packs: PackSummary[], zip: PackZip): PackSummary | null {
  const name = zip.input.name.trim().toLowerCase();
  const users = packs.filter((pack) => pack.source === 'user');
  return users.find((pack) => pack.id === zip.folderId) ?? users.find((pack) => pack.name.trim().toLowerCase() === name) ?? null;
}
