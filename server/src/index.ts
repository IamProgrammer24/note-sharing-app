import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { prisma } from "./lib/prisma";

import authRoutes from "./routes/auth";
import notesRoutes from "./routes/notes";
import shareRoutes from "./routes/share";

const app = new Hono();

// Allow requests from our Next.js client
app.use(
  "/api/*",
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

app.route("/api/auth", authRoutes);
app.route("/api/notes", notesRoutes);
app.route("/api/share", shareRoutes);

// Health-check route
app.get("/", (c) => {
  return c.json({
    success: true,
    message: "Note Sharing API is running",
  });
});

app.get("/health/db", async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return c.json({
      success: true,
      message: "Database connection is working",
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    return c.json(
      {
        success: false,
        message: "Database connection failed",
      },
      500,
    );
  }
});

// Start the server
const port = 5000;

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Server is running at http://localhost:${info.port}`);
  },
);
