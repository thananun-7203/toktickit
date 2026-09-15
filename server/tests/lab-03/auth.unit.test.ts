import { describe, expect, it } from "vitest";
import { normalizeEmail } from "../../src/auth.js";
import {
  PASSWORD_MAX_UTF8_BYTES,
  utf8ByteLength,
  validatePassword,
  verifyPassword,
  hashPassword,
} from "../../src/password.js";

describe("Lab 3 authentication helpers", () => {
  it("U-01: normalizes email with trim + lowercase", () => {
    expect(normalizeEmail("  Some.User@TokTick.IT  ")).toBe("some.user@toktick.it");
  });

  it("U-02/U-03: rejects short passwords and passwords missing a letter or digit", () => {
    expect(validatePassword("Short1").valid).toBe(false);
    expect(validatePassword("1234567890").valid).toBe(false);
    expect(validatePassword("abcdefghij").valid).toBe(false);
    // Five emoji are ten UTF-16 code units; they must still count as only five
    // characters for the minimum-length rule.
    expect(validatePassword(`${"😀".repeat(5)}A1`).valid).toBe(false);
  });

  it("U-04: applies the bcrypt boundary in UTF-8 bytes, not character count", () => {
    const valid = `${"a".repeat(61)}1234567890x`;
    expect(utf8ByteLength(valid)).toBe(PASSWORD_MAX_UTF8_BYTES);
    expect(validatePassword(valid).valid).toBe(true);

    const multibyte = `${"ก".repeat(22)}Abcdef1`;
    expect(multibyte.length).toBeLessThan(72);
    expect(utf8ByteLength(multibyte)).toBeGreaterThan(PASSWORD_MAX_UTF8_BYTES);
    expect(validatePassword(multibyte)).toEqual(
      expect.objectContaining({ valid: false, message: expect.stringMatching(/72 UTF-8 bytes/i) }),
    );
  });

  it("U-04: hashes passwords one-way and verifies only the matching value", async () => {
    const value = ["Valid", "Pass123"].join("");
    const hash = await hashPassword(value);
    expect(hash).not.toBe(value);
    expect(hash).toMatch(/^\$2[aby]\$/);
    await expect(verifyPassword(value, hash)).resolves.toBe(true);
    await expect(verifyPassword(`${value}x`, hash)).resolves.toBe(false);
  });
});
