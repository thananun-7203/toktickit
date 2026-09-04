const DEFAULT_FILER_URL = "http://localhost:8888";

export interface AttachmentStorage {
  put(key: string, body: Buffer, mimeType?: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

function encodeStorageKey(key: string): string {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export class SeaweedFilerStorage implements AttachmentStorage {
  constructor(private readonly baseUrl = process.env.SEAWEEDFS_FILER_URL ?? DEFAULT_FILER_URL) {}

  private url(key: string): string {
    return `${this.baseUrl.replace(/\/$/, "")}/${encodeStorageKey(key)}`;
  }

  async put(key: string, body: Buffer, mimeType = "application/octet-stream"): Promise<void> {
    const payload = body.buffer.slice(
      body.byteOffset,
      body.byteOffset + body.byteLength,
    ) as ArrayBuffer;
    const res = await fetch(this.url(key), {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: payload,
    });
    if (!res.ok) throw new Error(`SeaweedFS PUT failed (${res.status})`);
  }

  async get(key: string): Promise<Buffer> {
    const res = await fetch(this.url(key));
    if (!res.ok) throw new Error(`SeaweedFS GET failed (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    const res = await fetch(this.url(key), { method: "DELETE" });
    if (!res.ok && res.status !== 404) {
      throw new Error(`SeaweedFS DELETE failed (${res.status})`);
    }
  }
}

let overrideStorage: AttachmentStorage | null = null;
const defaultStorage = new SeaweedFilerStorage();

export function getAttachmentStorage(): AttachmentStorage {
  return overrideStorage ?? defaultStorage;
}

export function setAttachmentStorageForTests(storage: AttachmentStorage): void {
  overrideStorage = storage;
}

export function resetAttachmentStorageForTests(): void {
  overrideStorage = null;
}
