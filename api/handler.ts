// Import the main app with error handling
let app: any;
try {
  app = (await import("../src/server/index.js")).default;
  console.log("App loaded successfully");
} catch (e: any) {
  console.error("Failed to load app:", e?.message, e?.stack);
  // Fallback: create a minimal app
  const { Hono } = await import("hono");
  app = new Hono();
  app.get("/api/health", (c) =>
    c.json({ status: "error", message: e?.message || "Unknown error" }),
  );
  app.get("/*", (c) =>
    c.html(
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Open Barber</title><script type="module" src="/assets/index.js"></script></head><body><div id="root"></div></body></html>`,
    ),
  );
}

export const config = {
  runtime: "nodejs",
};

export default app;
