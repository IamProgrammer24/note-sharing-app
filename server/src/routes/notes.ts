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

    const normalizedExpiresAt = shareType === "one-time" ? null : expiresAt;

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

export default notesRoutes;
