import { Hono } from "hono";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

import { prisma } from "../lib/prisma";
import { getUserIdFromSession } from "../lib/auth";

const notesRoutes = new Hono();

const createNoteSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must be 200 characters or less"),

    content: z
      .string()
      .trim()
      .min(1, "Content is required")
      .max(100000, "Content is too long"),

    shareType: z.enum(["one-time", "time-based"]),
    accessType: z.enum(["public", "password"]),

    expiresAt: z.coerce.date().nullable().optional(),
  })
  .superRefine((data, context) => {
    if (data.shareType === "time-based") {
      if (!data.expiresAt) {
        context.addIssue({
          code: "custom",
          path: ["expiresAt"],
          message: "Expiry time is required for time-based access",
        });

        return;
      }

      if (data.expiresAt <= new Date()) {
        context.addIssue({
          code: "custom",
          path: ["expiresAt"],
          message: "Expiry time must be in the future",
        });
      }
    }
  });

function generateShareToken() {
  return randomBytes(32).toString("hex");
}

function generateAccessKey() {
  return randomBytes(9).toString("base64url");
}

notesRoutes.post("/", async (c) => {
  try {
    const userId = getUserIdFromSession(c);

    if (!userId) {
      return c.json(
        {
          success: false,
          message: "Authentication required",
        },
        401,
      );
    }

    const body = await c.req.json();
    const result = createNoteSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        {
          success: false,
          message: "Validation failed",
          errors: result.error.flatten().fieldErrors,
        },
        400,
      );
    }

    const { title, content, shareType, accessType, expiresAt } = result.data;

    const normalizedExpiresAt =
      shareType === "one-time" ? null : (expiresAt ?? null);

    const token = generateShareToken();
    const accessKey = accessType === "password" ? generateAccessKey() : null;

    const passwordHash = accessKey ? await bcrypt.hash(accessKey, 12) : null;

    const note = await prisma.note.create({
      data: {
        title,
        content,
        ownerId: userId,
        shareLinks: {
          create: {
            token,
            shareType: shareType === "one-time" ? "ONE_TIME" : "TIME_BASED",
            accessType: accessType === "public" ? "PUBLIC" : "PASSWORD",
            passwordHash,
            expiresAt: normalizedExpiresAt,
          },
        },
      },
      include: {
        shareLinks: {
          select: {
            token: true,
            shareType: true,
            accessType: true,
            expiresAt: true,
            viewCount: true,
          },
        },
      },
    });

    const shareLink = note.shareLinks[0];

    if (!shareLink) {
      throw new Error("Share link was not created");
    }

    return c.json(
      {
        success: true,
        message: "Note created successfully",
        note: {
          id: note.id,
          title: note.title,
          createdAt: note.createdAt,
        },
        share: {
          url: `${process.env.CLIENT_URL}/share/${shareLink.token}`,
          accessKey,
          shareType: shareLink.shareType,
          accessType: shareLink.accessType,
          expiresAt: shareLink.expiresAt,
        },
      },
      201,
    );
  } catch (error) {
    console.error("Create note error:", error);

    return c.json(
      {
        success: false,
        message: "Unable to create note",
      },
      500,
    );
  }
});

notesRoutes.get("/:id", async (c) => {
  try {
    const userId = getUserIdFromSession(c);

    if (!userId) {
      return c.json(
        {
          success: false,
          message: "Authentication required",
        },
        401,
      );
    }

    const noteId = c.req.param("id");

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        ownerId: userId,
      },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        shareLinks: {
          select: {
            token: true,
            shareType: true,
            accessType: true,
            expiresAt: true,
            usedAt: true,
            revokedAt: true,
            viewCount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!note) {
      return c.json(
        {
          success: false,
          message: "Note not found",
        },
        404,
      );
    }

    return c.json({
      success: true,
      note: {
        id: note.id,
        title: note.title,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
      shareLinks: note.shareLinks.map((link) => ({
        url: `${process.env.CLIENT_URL}/share/${link.token}`,
        shareType: link.shareType,
        accessType: link.accessType,
        expiresAt: link.expiresAt,
        usedAt: link.usedAt,
        revokedAt: link.revokedAt,
        viewCount: link.viewCount,
        createdAt: link.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get note error:", error);

    return c.json(
      {
        success: false,
        message: "Unable to fetch note",
      },
      500,
    );
  }
});

notesRoutes.post("/:id/revoke", async (c) => {
  try {
    const userId = getUserIdFromSession(c);

    if (!userId) {
      return c.json(
        {
          success: false,
          message: "Authentication required",
        },
        401,
      );
    }

    const noteId = c.req.param("id");

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        ownerId: userId,
      },
      select: {
        id: true,
      },
    });

    if (!note) {
      return c.json(
        {
          success: false,
          message: "Note not found",
        },
        404,
      );
    }

    const result = await prisma.shareLink.updateMany({
      where: {
        noteId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return c.json(
        {
          success: false,
          message: "Share link is already revoked or unavailable",
        },
        409,
      );
    }

    return c.json({
      success: true,
      message: "Share link revoked successfully",
    });
  } catch (error) {
    console.error("Revoke share link error:", error);

    return c.json(
      {
        success: false,
        message: "Unable to revoke share link",
      },
      500,
    );
  }
});

export default notesRoutes;
