import { Hono } from "hono";
import { handle } from "hono/vercel";
import app from "../src/server/index.js";

const debug = new Hono();

// Health check that doesn't touch the database
debug.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    env: process.env.DATABASE_URL ? "has_db_url" : "no_db_url",
    node: process.version,
    timestamp: new Date().toISOString(),
  });
});

// Mount the main app
debug.route("/", app);

export const config = {
  runtime: "nodejs",
};

export default handle(debug);
