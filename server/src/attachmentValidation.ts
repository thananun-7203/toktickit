import path from "node:path";

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_ACTIVE_ATTACHMENTS = 5;

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export interface IncomingAttachment {
  originalname: string;
  mimetype: string;
  size: number;
}

export function validateAttachmentFiles(files: IncomingAttachment[]): string[] {
  const invalid: string[] = [];

  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase();
    const typeAllowed = ALLOWED_EXTENSIONS.has(ext) && ALLOWED_MIME_TYPES.has(file.mimetype);
    const sizeAllowed = file.size <= MAX_ATTACHMENT_BYTES;
    if (!typeAllowed || !sizeAllowed) invalid.push(file.originalname);
  }

  return invalid;
}

export function safeStorageFileName(fileName: string): string {
  const base = path.basename(fileName).replace(/[^a-zA-Z0-9._-]+/g, "-");
  return base || "attachment";
}
