import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

export interface StoreFileInput {
  buffer: Buffer;
  filename: string;
  orgId: string;
  fileHash?: string;
}

export interface StoredFile {
  fileHash: string;
  fileSize: number;
  storagePath: string;
  storageUrl: string;
  deduplicated: boolean;
}

export class FileStorageService {
  private baseDir: string;
  private baseUrl?: string;

  constructor(options?: { baseDir?: string; baseUrl?: string }) {
    this.baseDir = options?.baseDir
      || process.env.DOCUMENT_STORAGE_DIR
      || path.join(process.cwd(), 'storage', 'documents');
    this.baseUrl = options?.baseUrl || process.env.DOCUMENT_STORAGE_BASE_URL;
  }

  private computeHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private buildStoragePath(orgId: string, fileHash: string, filename: string): string {
    const extension = path.extname(filename);
    const safeExtension = extension.length <= 10 ? extension : '';
    const prefixA = fileHash.slice(0, 2);
    const prefixB = fileHash.slice(2, 4);
    const fileName = `${fileHash}${safeExtension}`;
    return path.join(this.baseDir, orgId, prefixA, prefixB, fileName);
  }

  private toStorageUrl(storagePath: string): string {
    if (!this.baseUrl) return storagePath;
    const base = this.baseUrl.replace(/\/+$/, '');
    const relativePath = path.relative(this.baseDir, storagePath).split(path.sep).join('/');
    return `${base}/${relativePath}`;
  }

  getLocalPath(storageUrl: string): string | null {
    if (!storageUrl) return null;
    if (storageUrl.startsWith(this.baseDir)) return storageUrl;
    if (this.baseUrl && storageUrl.startsWith(this.baseUrl)) {
      const relativePath = storageUrl.slice(this.baseUrl.length).replace(/^\/+/, '');
      return path.join(this.baseDir, relativePath);
    }
    return null;
  }

  async storeFile(input: StoreFileInput): Promise<StoredFile> {
    const fileHash = input.fileHash || this.computeHash(input.buffer);
    const storagePath = this.buildStoragePath(input.orgId, fileHash, input.filename);

    let deduplicated = false;
    try {
      await fs.stat(storagePath);
      deduplicated = true;
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }

    if (!deduplicated) {
      await fs.mkdir(path.dirname(storagePath), { recursive: true });
      await fs.writeFile(storagePath, input.buffer);
    }

    return {
      fileHash,
      fileSize: input.buffer.length,
      storagePath,
      storageUrl: this.toStorageUrl(storagePath),
      deduplicated,
    };
  }

  async deleteFile(storageUrl: string): Promise<boolean> {
    const localPath = this.getLocalPath(storageUrl);
    if (!localPath) return false;
    try {
      await fs.unlink(localPath);
      return true;
    } catch (error: any) {
      if (error?.code === 'ENOENT') return false;
      throw error;
    }
  }
}

export const fileStorageService = new FileStorageService();
