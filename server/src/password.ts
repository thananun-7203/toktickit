import bcrypt from "bcrypt";

export const BCRYPT_COST = 12;
export const PASSWORD_MIN_CHARACTERS = 10;
export const PASSWORD_MAX_UTF8_BYTES = 72;

export type PasswordValidation = {
  valid: boolean;
  message?: string;
};

export function utf8ByteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

export function validatePassword(value: unknown): PasswordValidation {
  if (typeof value !== "string") {
    return { valid: false, message: "Password is required" };
  }
  // Count Unicode code points rather than UTF-16 code units so astral symbols
  // do not accidentally count as two "characters" toward the minimum.
  if ([...value].length < PASSWORD_MIN_CHARACTERS) {
    return { valid: false, message: "Password must be at least 10 characters" };
  }
  if (!/\p{L}/u.test(value)) {
    return { valid: false, message: "Password must include at least one letter" };
  }
  if (!/\p{Nd}/u.test(value)) {
    return { valid: false, message: "Password must include at least one digit" };
  }
  if (utf8ByteLength(value) > PASSWORD_MAX_UTF8_BYTES) {
    return { valid: false, message: "Password must be at most 72 UTF-8 bytes" };
  }
  return { valid: true };
}

export async function hashPassword(value: string): Promise<string> {
  return bcrypt.hash(value, BCRYPT_COST);
}

export async function verifyPassword(value: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(value, hash);
  } catch {
    return false;
  }
}
