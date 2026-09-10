import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";

const shareRoutes = new Hono();

const unlockSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

function isExpired(expiresAt: Date | null) {
  return expiresAt !== null && expiresAt <= new Date();
}

function isUnavailable(link: {
  expiresAt: Date | null;
  revokedAt: Date | null;
  usedAt: Date | null;
}) {
  return (
    link.revokedAt !== null || isExpired(link.expiresAt) || link.usedAt !== null
  );
}

async function consumeOneTimeLink(linkId: string) {
  const now = new Date();

  const result = await prisma.shareLink.updateMany({
    where: {
      id: linkId,
      usedAt: null,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    data: {
      usedAt: now,
      viewCount: {
        increment: 1,
      },
    },
  });

  return result.count === 1;
}

async function countTimeBasedView(linkId: string) {
  const now = new Date();

  const result = await prisma.shareLink.updateMany({
    where: {
      id: linkId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    data: {
      viewCount: {
        increment: 1,
      },
    },
  });

  return result.count === 1;
}

function noteResponse(note: { id: string; title: string; content: string }) {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
  };
}

// GET public share information or password requirement
shareRoutes.get("/:token", async (c) => {
  try {
    const token = c.req.param("token");

    const link = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        note: {
          select: {
            id: true,
            title: true,
            content: true,
          },
        },
      },
    });

    if (!link) {
      return c.json(
        {
          success: false,
          message: "Share link not found",
        },
        404,
      );
    }

    if (isUnavailable(link)) {
      return c.json(
        {
          success: false,
          message: "This share link is expired, revoked, or already used",
        },
        410,
      );
    }

    if (link.accessType === "PASSWORD") {
      return c.json({
        success: true,
        requiresPassword: true,
        message: "Password required",
      });
    }

    const viewRecorded =
      link.shareType === "ONE_TIME"
        ? await consumeOneTimeLink(link.id)
        : await countTimeBasedView(link.id);

    if (!viewRecorded) {
      return c.json(
        {
          success: false,
          message: "This share link is no longer available",
        },
        410,
      );
    }

    return c.json({
      success: true,
      requiresPassword: false,
      note: noteResponse(link.note),
    });
  } catch (error) {
    console.error("Share access error:", error);

    return c.json(
      {
        success: false,
        message: "Unable to access share link",
      },
      500,
    );
  }
});

// Unlock a password-protected share link
shareRoutes.post("/:token/unlock", async (c) => {
  try {
    const token = c.req.param("token");
    const body = await c.req.json();

    const result = unlockSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        {
          success: false,
          message: "Password is required",
        },
        400,
      );
    }

    const link = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        note: {
          select: {
            id: true,
            title: true,
            content: true,
          },
        },
      },
    });

    if (!link) {
      return c.json(
        {
          success: false,
          message: "Share link not found",
        },
        404,
      );
    }

    if (isUnavailable(link)) {
      return c.json(
        {
          success: false,
          message: "This share link is expired, revoked, or already used",
        },
        410,
      );
    }

    if (link.accessType !== "PASSWORD" || !link.passwordHash) {
      return c.json(
        {
          success: false,
          message: "This link does not require a password",
        },
        400,
      );
    }

    const passwordMatches = await bcrypt.compare(
      result.data.password,
      link.passwordHash,
    );

    if (!passwordMatches) {
      return c.json(
        {
          success: false,
          message: "Invalid password",
        },
        401,
      );
    }

    const viewRecorded =
      link.shareType === "ONE_TIME"
        ? await consumeOneTimeLink(link.id)
        : await countTimeBasedView(link.id);

    if (!viewRecorded) {
      return c.json(
        {
          success: false,
          message: "This share link is no longer available",
        },
        410,
      );
    }

    return c.json({
      success: true,
      message: "Share link unlocked",
      note: noteResponse(link.note),
    });
  } catch (error) {
    console.error("Share unlock error:", error);

    return c.json(
      {
        success: false,
        message: "Unable to unlock share link",
      },
      500,
    );
  }
});

export default shareRoutes;
