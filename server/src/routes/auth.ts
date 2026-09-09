import { Hono } from "hono";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { setCookie } from "hono/cookie";
import jwt from "jsonwebtoken";
import { getUserIdFromSession } from "../lib/auth";

import { prisma } from "../lib/prisma";

const authRoutes = new Hono();

const registerSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

authRoutes.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const result = registerSchema.safeParse(body);

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

    const email = result.data.email.toLowerCase().trim();
    const { password } = result.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return c.json(
        {
          success: false,
          message: "An account with this email already exists",
        },
        409,
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    return c.json(
      {
        success: true,
        message: "Account created successfully",
        user,
      },
      201,
    );
  } catch (error) {
    console.error("Registration error:", error);

    return c.json(
      {
        success: false,
        message: "Unable to create account",
      },
      500,
    );
  }
});

const loginSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
});

authRoutes.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const result = loginSchema.safeParse(body);

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

    const email = result.data.email.toLowerCase().trim();
    const { password } = result.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    const isPasswordValid = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!user || !isPasswordValid) {
      return c.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        401,
      );
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured");

      return c.json(
        {
          success: false,
          message: "Server configuration error",
        },
        500,
      );
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
      },
      jwtSecret,
      {
        expiresIn: "7d",
      },
    );

    setCookie(c, "session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return c.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return c.json(
      {
        success: false,
        message: "Unable to log in",
      },
      500,
    );
  }
});

authRoutes.get("/me", async (c) => {
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });

  if (!user) {
    return c.json(
      {
        success: false,
        message: "User no longer exists",
      },
      401,
    );
  }

  return c.json({
    success: true,
    user,
  });
});

export default authRoutes;
