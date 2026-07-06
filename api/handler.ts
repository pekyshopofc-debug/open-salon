// Minimal test - no database, no complex imports
import { Hono } from "hono";

const app = new Hono();

app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    env: process.env.DATABASE_URL ? "has_db" : "no_db",
    node: process.version,
  });
});

app.get("/api/stats", (c) => {
  return c.json({
    appointments: 0,
    clients: 0,
    staff: 0,
    services: 0,
    products: 0,
    today_appointments: 0,
    upcoming_appointments: 0,
    completed_appointments: 0,
    revenue: 0,
    low_stock_products: 0,
  });
});

// All other routes return the SPA
app.get("/*", (c) => {
  return c.html(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Open Barber</title><script type="module" src="/assets/index.js"></script></head><body><div id="root"></div></body></html>`);
});

export const config = {
  runtime: "nodejs",
};

export default app;
