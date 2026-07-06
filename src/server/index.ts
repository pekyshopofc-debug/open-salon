import { Hono } from "hono";

// Lazy database initialization — will be set on first request
let queryFn: ((sql: string, params?: any[]) => Promise<any[]>) | null = null;
let getFn: ((sql: string, params?: any[]) => Promise<any>) | null = null;
let runFn: ((sql: string, params?: any[]) => Promise<{ lastInsertRowid: number; changes: number }>) | null = null;
let dbReady = false;

async function ensureDb() {
  if (dbReady) return true;
  try {
    const mod = await import("./db-neon.js");
    mod.initDB();
    queryFn = mod.query;
    getFn = mod.get;
    runFn = mod.run;
    dbReady = true;
    return true;
  } catch (e) {
    console.error("DB init failed:", e);
    return false;
  }
}

const app = new Hono();

// Initialize database on first request
app.use("*", async (_c, next) => {
  await ensureDb();
  await next();
});

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// Safe DB helpers
async function q(sql: string, params?: any[]): Promise<any[]> {
  if (!queryFn) return [];
  try { return await queryFn(sql, params); } catch { return []; }
}
async function g(sql: string, params?: any[]): Promise<any> {
  if (!getFn) return null;
  try { return await getFn(sql, params); } catch { return null; }
}
async function r(sql: string, params?: any[]): Promise<{ lastInsertRowid: number; changes: number }> {
  if (!runFn) return { lastInsertRowid: 0, changes: 0 };
  try { return await runFn(sql, params); } catch { return { lastInsertRowid: 0, changes: 0 }; }
}

// ── Stats ──
app.get("/api/stats", async (c) => {
  const today = new Date().toISOString().split("T")[0];
  return c.json({
    appointments: (await g("SELECT COUNT(*) as count FROM appointments"))?.count || 0,
    clients: (await g("SELECT COUNT(*) as count FROM clients"))?.count || 0,
    staff: (await g("SELECT COUNT(*) as count FROM staff WHERE active = 1"))?.count || 0,
    services: (await g("SELECT COUNT(*) as count FROM services WHERE active = 1"))?.count || 0,
    products: (await g("SELECT COUNT(*) as count FROM products"))?.count || 0,
    today_appointments: (await g("SELECT COUNT(*) as count FROM appointments WHERE scheduled_date = $1", [today]))?.count || 0,
    upcoming_appointments: (await g("SELECT COUNT(*) as count FROM appointments WHERE status IN ('booked', 'confirmed') AND scheduled_date >= $1", [today]))?.count || 0,
    completed_appointments: (await g("SELECT COUNT(*) as count FROM appointments WHERE status = 'completed'"))?.count || 0,
    revenue: (await g("SELECT COALESCE(SUM(total_price), 0) as total FROM appointments WHERE status = 'completed'"))?.total || 0,
    low_stock_products: (await g("SELECT COUNT(*) as count FROM products WHERE stock <= low_stock_alert"))?.count || 0,
  });
});

// ── Calendar ──
app.get("/api/calendar", async (c) => {
  const start = c.req.query("start") || "";
  const end = c.req.query("end") || "";
  const appointments = await q(
    `SELECT a.*, cl.name as client_name, cl.phone as client_phone,
            s.name as staff_name, s.color as staff_color
     FROM appointments a LEFT JOIN clients cl ON cl.id = a.client_id
     LEFT JOIN staff s ON s.id = a.staff_id
     WHERE a.scheduled_date >= $1 AND a.scheduled_date <= $2 AND a.status != 'cancelled'
     ORDER BY a.start_time ASC`, [start, end],
  );
  for (const apt of appointments) {
    apt.appointment_services = await q(
      `SELECT aps.*, sv.name as service_name FROM appointment_services aps
       LEFT JOIN services sv ON sv.id = aps.service_id WHERE aps.appointment_id = $1`, [apt.id],
    );
  }
  const blockedSlots = await q(
    `SELECT b.*, s.name as staff_name FROM blocked_slots b
     LEFT JOIN staff s ON s.id = b.staff_id
     WHERE b.blocked_date >= $1 AND b.blocked_date <= $2 ORDER BY b.start_time ASC`, [start, end],
  );
  return c.json({ appointments, blocked_slots: blockedSlots });
});

// ── Appointments List ──
app.get("/api/appointments", async (c) => {
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = (page - 1) * limit;
  let where = "WHERE 1=1";
  const params: any[] = [];
  const search = c.req.query("search");
  const status = c.req.query("status");
  const date = c.req.query("date");
  const staffId = c.req.query("staff_id");
  if (search) { where += " AND (a.identifier LIKE $1 OR cl.name LIKE $2)"; const s = `%${search}%`; params.push(s, s); }
  if (status) { where += ` AND a.status = $${params.length + 1}`; params.push(status); }
  if (date) { where += ` AND a.scheduled_date = $${params.length + 1}`; params.push(date); }
  if (staffId) { where += ` AND a.staff_id = $${params.length + 1}`; params.push(staffId); }
  const total = (await g(`SELECT COUNT(*) as count FROM appointments a LEFT JOIN clients cl ON cl.id = a.client_id ${where}`, params))?.count || 0;
  const appointments = await q(
    `SELECT a.*, cl.name as client_name, cl.phone as client_phone,
            s.name as staff_name, s.color as staff_color
     FROM appointments a LEFT JOIN clients cl ON cl.id = a.client_id
     LEFT JOIN staff s ON s.id = a.staff_id ${where}
     ORDER BY a.scheduled_date DESC, a.start_time ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );
  return c.json({ appointments, total });
});

// ── Appointment Detail ──
app.get("/api/appointments/:id", async (c) => {
  const { id } = c.req.param();
  const apt = await g(
    `SELECT a.*, cl.name as client_name, cl.phone as client_phone,
            s.name as staff_name, s.color as staff_color
     FROM appointments a LEFT JOIN clients cl ON cl.id = a.client_id
     LEFT JOIN staff s ON s.id = a.staff_id WHERE a.id = $1`, [id],
  );
  if (!apt) return c.json({ error: "Not found" }, 404);
  apt.appointment_services = await q(
    `SELECT aps.*, sv.name as service_name FROM appointment_services aps
     LEFT JOIN services sv ON sv.id = aps.service_id WHERE aps.appointment_id = $1`, [id],
  );
  apt.appointment_notes = await q("SELECT * FROM appointment_notes WHERE appointment_id = $1 ORDER BY created_at DESC", [id]);
  return c.json({ appointment: apt });
});

// ── Create Appointment ──
app.post("/api/appointments", async (c) => {
  const body: any = await c.req.json();
  const identifier = `APT-${Date.now()}`;
  const startTime = body.start_time || "09:00";
  let totalDuration = 60;
  let totalPrice = 0;
  const serviceIds: number[] = body.service_ids || [];
  if (serviceIds.length > 0) {
    const svcs = await q(
      `SELECT duration, price FROM services WHERE id IN (${serviceIds.map((_, i) => `$${i + 1}`).join(",")})`, serviceIds,
    );
    totalDuration = svcs.reduce((sum: number, s: any) => sum + (s.duration || 60), 0);
    totalPrice = svcs.reduce((sum: number, s: any) => sum + (s.price || 0), 0);
  }
  const endTime = addMinutes(startTime, totalDuration);
  const result = await r(
    `INSERT INTO appointments (identifier, client_id, staff_id, scheduled_date, start_time, end_time, total_price, notes, is_recurring, recurrence_interval)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [identifier, body.client_id, body.staff_id ?? null, body.scheduled_date, startTime, endTime, totalPrice, body.notes || "", body.is_recurring || 0, body.recurrence_interval || ""],
  );
  for (let i = 0; i < serviceIds.length; i++) {
    const svc = await g("SELECT duration, price FROM services WHERE id = $1", [serviceIds[i]]);
    if (svc) await r("INSERT INTO appointment_services (appointment_id, service_id, price, duration) VALUES ($1, $2, $3, $4)", [result.lastInsertRowid, serviceIds[i], svc.price, svc.duration]);
  }
  const apt = await g(
    `SELECT a.*, cl.name as client_name, cl.phone as client_phone,
            s.name as staff_name, s.color as staff_color
     FROM appointments a LEFT JOIN clients cl ON cl.id = a.client_id
     LEFT JOIN staff s ON s.id = a.staff_id WHERE a.id = $1`, [result.lastInsertRowid],
  );
  return c.json({ appointment: apt }, 201);
});

// ── Update Appointment ──
app.put("/api/appointments/:id", async (c) => {
  const { id } = c.req.param();
  const body: any = await c.req.json();
  const sets: string[] = [];
  const params: any[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (val !== undefined) { sets.push(`${key} = $${params.length + 1}`); params.push(val); }
  }
  if (sets.length > 0) {
    sets.push(`updated_at = NOW()`);
    await r(`UPDATE appointments SET ${sets.join(", ")} WHERE id = $${params.length + 1}`, [...params, id]);
  }
  return c.json({ ok: true });
});

// ── Delete Appointment ──
app.delete("/api/appointments/:id", async (c) => {
  const { id } = c.req.param();
  await r("DELETE FROM appointments WHERE id = $1", [id]);
  return c.json({ ok: true });
});

// ── Appointment Notes ──
app.post("/api/appointments/:id/notes", async (c) => {
  const { id } = c.req.param();
  const body: any = await c.req.json();
  await r("INSERT INTO appointment_notes (appointment_id, content) VALUES ($1, $2)", [id, body.content]);
  return c.json({ ok: true }, 201);
});

app.delete("/api/notes/:id", async (c) => {
  const { id } = c.req.param();
  await r("DELETE FROM appointment_notes WHERE id = $1", [id]);
  return c.json({ ok: true });
});

// ── Clients List ──
app.get("/api/clients", async (c) => {
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = (page - 1) * limit;
  const search = c.req.query("search");
  let where = "WHERE 1=1";
  const params: any[] = [];
  if (search) { where += " AND (c.name LIKE $1 OR c.email LIKE $2 OR c.phone LIKE $3)"; const s = `%${search}%`; params.push(s, s, s); }
  const total = (await g(`SELECT COUNT(*) as count FROM clients c ${where}`, params))?.count || 0;
  const clients = await q(
    `SELECT c.*, (SELECT COUNT(*) FROM appointments WHERE client_id = c.id) as appointment_count
     FROM clients c ${where} ORDER BY c.name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset],
  );
  return c.json({ clients, total });
});

app.get("/api/clients/all", async (c) => {
  const clients = await q("SELECT id, name FROM clients ORDER BY name ASC");
  return c.json({ clients });
});

app.get("/api/clients/:id", async (c) => {
  const { id } = c.req.param();
  const client = await g("SELECT * FROM clients WHERE id = $1", [id]);
  if (!client) return c.json({ error: "Not found" }, 404);
  const appointments = await q(
    `SELECT a.*, s.name as staff_name, s.color as staff_color
     FROM appointments a LEFT JOIN staff s ON s.id = a.staff_id
     WHERE a.client_id = $1 ORDER BY a.scheduled_date DESC LIMIT 50`, [id],
  );
  return c.json({ client, appointments });
});

app.post("/api/clients", async (c) => {
  const body: any = await c.req.json();
  const result = await r("INSERT INTO clients (name, email, phone, notes) VALUES ($1, $2, $3, $4) RETURNING id", [body.name, body.email || "", body.phone || "", body.notes || ""]);
  const client = await g("SELECT * FROM clients WHERE id = $1", [result.lastInsertRowid]);
  return c.json({ client }, 201);
});

app.put("/api/clients/:id", async (c) => {
  const { id } = c.req.param();
  const body: any = await c.req.json();
  const sets: string[] = [];
  const params: any[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (val !== undefined) { sets.push(`${key} = $${params.length + 1}`); params.push(val); }
  }
  if (sets.length > 0) { sets.push("updated_at = NOW()"); await r(`UPDATE clients SET ${sets.join(", ")} WHERE id = $${params.length + 1}`, [...params, id]); }
  return c.json({ ok: true });
});

app.delete("/api/clients/:id", async (c) => {
  const { id } = c.req.param();
  await r("DELETE FROM clients WHERE id = $1", [id]);
  return c.json({ ok: true });
});

// ── Staff ──
app.get("/api/staff", async (c) => {
  const staff = await q(`SELECT s.*, (SELECT COUNT(*) FROM appointments WHERE staff_id = s.id) as appointment_count FROM staff s ORDER BY s.name ASC`);
  return c.json({ staff });
});

app.get("/api/staff/all", async (c) => {
  const staff = await q("SELECT id, name, color FROM staff WHERE active = 1 ORDER BY name ASC");
  return c.json({ staff });
});

app.post("/api/staff", async (c) => {
  const body: any = await c.req.json();
  const result = await r("INSERT INTO staff (name, email, phone, title, color) VALUES ($1, $2, $3, $4, $5) RETURNING id", [body.name, body.email || "", body.phone || "", body.title || "", body.color || "#7c3aed"]);
  const staff = await g("SELECT * FROM staff WHERE id = $1", [result.lastInsertRowid]);
  return c.json({ staff }, 201);
});

app.put("/api/staff/:id", async (c) => {
  const { id } = c.req.param();
  const body: any = await c.req.json();
  const sets: string[] = [];
  const params: any[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (val !== undefined) { sets.push(`${key} = $${params.length + 1}`); params.push(val); }
  }
  if (sets.length > 0) await r(`UPDATE staff SET ${sets.join(", ")} WHERE id = $${params.length + 1}`, [...params, id]);
  return c.json({ ok: true });
});

app.delete("/api/staff/:id", async (c) => {
  const { id } = c.req.param();
  await r("DELETE FROM staff WHERE id = $1", [id]);
  return c.json({ ok: true });
});

// ── Services ──
app.get("/api/services", async (c) => {
  const services = await q("SELECT * FROM services ORDER BY category ASC, name ASC");
  return c.json({ services });
});

app.post("/api/services", async (c) => {
  const body: any = await c.req.json();
  const result = await r("INSERT INTO services (name, description, duration, price, color, category) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id", [body.name, body.description || "", body.duration || 60, body.price || 0, body.color || "#6b7280", body.category || ""]);
  const service = await g("SELECT * FROM services WHERE id = $1", [result.lastInsertRowid]);
  return c.json({ service }, 201);
});

app.put("/api/services/:id", async (c) => {
  const { id } = c.req.param();
  const body: any = await c.req.json();
  const sets: string[] = [];
  const params: any[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (val !== undefined) { sets.push(`${key} = $${params.length + 1}`); params.push(val); }
  }
  if (sets.length > 0) await r(`UPDATE services SET ${sets.join(", ")} WHERE id = $${params.length + 1}`, [...params, id]);
  return c.json({ ok: true });
});

app.delete("/api/services/:id", async (c) => {
  const { id } = c.req.param();
  await r("DELETE FROM services WHERE id = $1", [id]);
  return c.json({ ok: true });
});

// ── Blocked Slots ──
app.post("/api/blocked-slots", async (c) => {
  const body: any = await c.req.json();
  await r("INSERT INTO blocked_slots (staff_id, blocked_date, start_time, end_time, reason) VALUES ($1, $2, $3, $4, $5)", [body.staff_id, body.blocked_date, body.start_time, body.end_time, body.reason || ""]);
  return c.json({ ok: true }, 201);
});

app.delete("/api/blocked-slots/:id", async (c) => {
  const { id } = c.req.param();
  await r("DELETE FROM blocked_slots WHERE id = $1", [id]);
  return c.json({ ok: true });
});

// ── Products ──
app.get("/api/products", async (c) => {
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = (page - 1) * limit;
  const search = c.req.query("search");
  const category = c.req.query("category");
  let where = "WHERE 1=1";
  const params: any[] = [];
  if (search) { where += " AND (p.name LIKE $1 OR p.brand LIKE $2 OR p.sku LIKE $3)"; const s = `%${search}%`; params.push(s, s, s); }
  if (category) { where += ` AND p.category = $${params.length + 1}`; params.push(category); }
  const total = (await g(`SELECT COUNT(*) as count FROM products p ${where}`, params))?.count || 0;
  const products = await q(`SELECT * FROM products p ${where} ORDER BY p.name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]);
  return c.json({ products, total });
});

app.post("/api/products", async (c) => {
  const body: any = await c.req.json();
  const result = await r("INSERT INTO products (name, brand, category, sku, price, cost, stock, low_stock_alert) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id", [body.name, body.brand || "", body.category || "", body.sku || "", body.price || 0, body.cost || 0, body.stock || 0, body.low_stock_alert || 5]);
  const product = await g("SELECT * FROM products WHERE id = $1", [result.lastInsertRowid]);
  return c.json({ product }, 201);
});

app.put("/api/products/:id", async (c) => {
  const { id } = c.req.param();
  const body: any = await c.req.json();
  const sets: string[] = [];
  const params: any[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (val !== undefined) { sets.push(`${key} = $${params.length + 1}`); params.push(val); }
  }
  if (sets.length > 0) { sets.push("updated_at = NOW()"); await r(`UPDATE products SET ${sets.join(", ")} WHERE id = $${params.length + 1}`, [...params, id]); }
  return c.json({ ok: true });
});

app.delete("/api/products/:id", async (c) => {
  const { id } = c.req.param();
  await r("DELETE FROM products WHERE id = $1", [id]);
  return c.json({ ok: true });
});

export default app;
