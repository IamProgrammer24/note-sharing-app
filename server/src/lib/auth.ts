import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import jwt from "jsonwebtoken";

type SessionPayload = {
  sub?: string;
};

export function getUserIdFromSession(c: Context): string | null {
  const sessionToken = getCookie(c, "session");
  const jwtSecret = process.env.JWT_SECRET;

  if (!sessionToken || !jwtSecret) {
    return null;
  }

  try {
    const decoded = jwt.verify(sessionToken, jwtSecret);

    if (typeof decoded === "object" && decoded !== null && "sub" in decoded) {
      const payload = decoded as SessionPayload;

      return typeof payload.sub === "string" ? payload.sub : null;
    }

    return null;
  } catch {
    return null;
  }
}
