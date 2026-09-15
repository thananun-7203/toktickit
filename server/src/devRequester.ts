import { Request, Response, NextFunction } from "express";
import { getPrisma } from "./prisma.js";

// Lab 2 Issue 2 — Development Requester context (simulated identity).
// Every ticket-scoped request must carry the X-Dev-Requester-Id header
// (api-spec.md FR-1 / BR-1). This helper resolves and validates that header so
// later Issues (Create / My Tickets / Attachments) reuse it instead of
// duplicating the logic in `app.ts`.

export const DEV_REQUESTER_HEADER = "x-dev-requester-id";

// Temporary Lab 2 compatibility bridge for Issue 2 only. The persisted
// DevelopmentRequester model has been migrated to User, but legacy Requester
// routes keep the old header until Issue 3 replaces the normal flow with the
// authenticated session identity.
// Attaches the acting Requester User to `res.locals.devRequester`.
// Responds 401 when the header is missing, not a number, or refers to an
// unknown / inactive requester (BR-6).
export async function requireDevRequester(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawId = req.header(DEV_REQUESTER_HEADER);
    if (!rawId) {
      res.status(401).json({ error: { message: "Missing X-Dev-Requester-Id header" } });
      return;
    }
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(401).json({ error: { message: "Invalid X-Dev-Requester-Id" } });
      return;
    }

    const prisma = getPrisma();
    const requester = await prisma.user.findFirst({
      where: { id, role: "REQUESTER" },
      select: { id: true, name: true, email: true, isActive: true },
    });

    if (!requester || !requester.isActive) {
      res.status(401).json({ error: { message: "Unknown or inactive requester" } });
      return;
    }

    res.locals.devRequester = requester;
    next();
  } catch {
    res.status(500).json({ error: { message: "Unable to resolve requester" } });
  }
}
