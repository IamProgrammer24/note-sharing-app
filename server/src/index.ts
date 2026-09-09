import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";

const app = new Hono();

// Allow requests from our Next.js client
app.use(
  "*",
  cors({
    origin: "http://localhost:3000",
  }),
);

// Health-check route
app.get("/", (c) => {
  return c.json({
    success: true,
    message: "Note Sharing API is running",
  });
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
