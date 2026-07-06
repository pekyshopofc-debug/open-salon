import { Hono } from "hono";
import { z } from "zod";

// ── Lazy database initialization ──
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

// ── SQL injection protection: whitelist of allowed columns per table ──
const ALLOWED_COLUMNS: Record<string, string[]> = {
  clients: ["name", "email", "phone", "photo_url", "birth_date", "cpf", "address", "instagram", "referral_source", "notes"],
  staff: ["name", "email", "phone", "photo_url", "bio", "specialties", "commission_rate", "hire_date", "title", "color", "active"],
  services: ["name", "description", "duration", "price", "color", "category", "active"],
  products: ["name", "brand", "category", "sku", "photo_url", "price", "cost", "stock", "low_stock_alert"],
  appointments: ["client_id", "staff_id", "status", "scheduled_date", "start_time", "end_time", "total_price", "notes", "is_recurring", "recurrence_interval"],
};

function buildUpdate(table: string, body: Record<string, unknown>): { sets: string[]; params: unknown[] } {
  const allowed = ALLOWED_COLUMNS[table] || [];
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (val !== undefined && allowed.includes(key)) {
      sets.push(`${key} = $${params.length + 1}`);
      params.push(val);
    }
  }
  return { sets, params };
}

// ── Zod schemas ──
const ClientPostSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().optional(),
  phone: z.string().optional(),
  photo_url: z.string().optional(),
  birth_date: z.string().optional(),
  cpf: z.string().optional(),
  address: z.string().optional(),
  instagram: z.string().optional(),
  referral_source: z.string().optional(),
  notes: z.string().optional(),
});

const StaffPostSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().optional(),
  phone: z.string().optional(),
  photo_url: z.string().optional(),
  bio: z.string().optional(),
  specialties: z.string().optional(),
  commission_rate: z.number().optional(),
  hire_date: z.string().optional(),
  title: z.string().optional(),
  color: z.string().optional(),
  active: z.number().optional(),
});

const ProductPostSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  brand: z.string().optional(),
  category: z.string().optional(),
  sku: z.string().optional(),
  photo_url: z.string().optional(),
  price: z.number().optional(),
  cost: z.number().optional(),
  stock: z.number().optional(),
  low_stock_alert: z.number().optional(),
});

// ── File Upload ──
app.post("/api/upload", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return c.json({ error: "Nenhum arquivo enviado" }, 400);

  const buffer = await file.arrayBuffer();

  // Vercel Blob when token is available
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const ext = file.name.split(".").pop() || "jpg";
      const blob = await put(`uploads/${Date.now()}.${ext}`, buffer, {
        access: "public",
        contentType: file.type,
      });
      return c.json({ url: blob.url });
    } catch {
      // fall through to base64 fallback
    }
  }

  // Fallback: base64 data-URL
  const base64 = Buffer.from(buffer).toString("base64");
  return c.json({ url: `data:${file.type};base64,${base64}` });
});

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
  if (search) { where += " AND (a.identifier ILIKE $1 OR cl.name ILIKE $2)"; const s = `%${search}%`; params.push(s, s); }
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
  const { sets, params } = buildUpdate("appointments", body);
  if (sets.length > 0) {
    sets.push("updated_at = NOW()");
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
  if (search) { where += " AND (c.name ILIKE $1 OR c.email ILIKE $2 OR c.phone ILIKE $3)"; const s = `%${search}%`; params.push(s, s, s); }
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
  const parsed = ClientPostSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors.map(e => e.message).join(", ") }, 400);
  }
  const data = parsed.data;
  const result = await r(
    `INSERT INTO clients (name, email, phone, photo_url, birth_date, cpf, address, instagram, referral_source, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [data.name, data.email ?? "", data.phone ?? "", data.photo_url ?? "", data.birth_date ?? "", data.cpf ?? "", data.address ?? "", data.instagram ?? "", data.referral_source ?? "", data.notes ?? ""],
  );
  const client = await g("SELECT * FROM clients WHERE id = $1", [result.lastInsertRowid]);
  return c.json({ client }, 201);
});

app.put("/api/clients/:id", async (c) => {
  const { id } = c.req.param();
  const body: any = await c.req.json();
  const parsed = ClientPostSchema.partial().safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors.map(e => e.message).join(", ") }, 400);
  }
  const { sets, params } = buildUpdate("clients", parsed.data as Record<string, unknown>);
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
  const parsed = StaffPostSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors.map(e => e.message).join(", ") }, 400);
  }
  const data = parsed.data;
  const result = await r(
    `INSERT INTO staff (name, email, phone, photo_url, bio, specialties, commission_rate, hire_date, title, color, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    [data.name, data.email ?? "", data.phone ?? "", data.photo_url ?? "", data.bio ?? "", data.specialties ?? "", data.commission_rate ?? 0, data.hire_date ?? "", data.title ?? "", data.color ?? "#7c3aed", data.active ?? 1],
  );
  const staff = await g("SELECT * FROM staff WHERE id = $1", [result.lastInsertRowid]);
  return c.json({ staff }, 201);
});

app.put("/api/staff/:id", async (c) => {
  const { id } = c.req.param();
  const body: any = await c.req.json();
  const parsed = StaffPostSchema.partial().safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors.map(e => e.message).join(", ") }, 400);
  }
  const { sets, params } = buildUpdate("staff", parsed.data as Record<string, unknown>);
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
  const { sets, params } = buildUpdate("services", body);
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
  if (search) { where += " AND (p.name ILIKE $1 OR p.brand ILIKE $2 OR p.sku ILIKE $3)"; const s = `%${search}%`; params.push(s, s, s); }
  if (category) { where += ` AND p.category = $${params.length + 1}`; params.push(category); }
  const total = (await g(`SELECT COUNT(*) as count FROM products p ${where}`, params))?.count || 0;
  const products = await q(`SELECT * FROM products p ${where} ORDER BY p.name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]);
  return c.json({ products, total });
});

app.post("/api/products", async (c) => {
  const body: any = await c.req.json();
  const parsed = ProductPostSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors.map(e => e.message).join(", ") }, 400);
  }
  const data = parsed.data;
  const result = await r(
    `INSERT INTO products (name, brand, category, sku, photo_url, price, cost, stock, low_stock_alert)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [data.name, data.brand ?? "", data.category ?? "", data.sku ?? "", data.photo_url ?? "", data.price ?? 0, data.cost ?? 0, data.stock ?? 0, data.low_stock_alert ?? 5],
  );
  const product = await g("SELECT * FROM products WHERE id = $1", [result.lastInsertRowid]);
  return c.json({ product }, 201);
});

app.put("/api/products/:id", async (c) => {
  const { id } = c.req.param();
  const body: any = await c.req.json();
  const parsed = ProductPostSchema.partial().safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors.map(e => e.message).join(", ") }, 400);
  }
  const { sets, params } = buildUpdate("products", parsed.data as Record<string, unknown>);
  if (sets.length > 0) { sets.push("updated_at = NOW()"); await r(`UPDATE products SET ${sets.join(", ")} WHERE id = $${params.length + 1}`, [...params, id]); }
  return c.json({ ok: true });
});

app.delete("/api/products/:id", async (c) => {
  const { id } = c.req.param();
  await r("DELETE FROM products WHERE id = $1", [id]);
  return c.json({ ok: true });
});

// ═══════════════════════════════════════════════════
// PUBLIC API — Portal do Cliente
// ═══════════════════════════════════════════════════

const BUSINESS_START = "08:00";
const BUSINESS_END = "20:00";

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// ── List active services ──
app.get("/api/public/services", async (c) => {
  const services = await q(
    "SELECT id, name, description, duration, price, color, category FROM services WHERE active = 1 ORDER BY category ASC, name ASC",
  );
  return c.json({ services });
});

// ── List active staff ──
app.get("/api/public/staff", async (c) => {
  const staff = await q(
    "SELECT id, name, COALESCE(photo_url, '') as photo_url, COALESCE(bio, '') as bio, COALESCE(specialties, '') as specialties, title, color FROM staff WHERE active = 1 ORDER BY name ASC",
  );
  return c.json({ staff });
});

// ── Available time slots for a staff member on a given date ──
// GET /api/public/slots?staff_id=1&date=2025-01-15&duration=60
app.get("/api/public/slots", async (c) => {
  const staffId = parseInt(c.req.query("staff_id") || "0", 10);
  const date = c.req.query("date") || "";
  const duration = parseInt(c.req.query("duration") || "60", 10);

  if (!staffId || !date) {
    return c.json({ slots: [] });
  }

  // Get existing appointments for this staff on this date
  const appointments = await q(
    `SELECT start_time, end_time FROM appointments
     WHERE staff_id = $1 AND scheduled_date = $2 AND status NOT IN ('cancelled', 'no_show')`,
    [staffId, date],
  );

  // Get blocked slots for this staff on this date
  const blocked = await q(
    `SELECT start_time, end_time FROM blocked_slots
     WHERE staff_id = $1 AND blocked_date = $2`,
    [staffId, date],
  );

  const busyRanges = [...appointments, ...blocked].map((b: any) => ({
    start: timeToMinutes(b.start_time),
    end: timeToMinutes(b.end_time),
  }));

  const startBusiness = timeToMinutes(BUSINESS_START);
  const endBusiness = timeToMinutes(BUSINESS_END);
  const slotDuration = duration;
  const step = 30; // slots every 30 minutes
  const slots: string[] = [];

  for (let t = startBusiness; t + slotDuration <= endBusiness; t += step) {
    const slotEnd = t + slotDuration;
    const conflicts = busyRanges.some((b) => t < b.end && slotEnd > b.start);
    if (!conflicts) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }

  return c.json({ slots });
});

// ── Book appointment (public) ──
app.post("/api/public/book", async (c) => {
  const body: any = await c.req.json();
  const { name, phone, email, service_ids, staff_id, scheduled_date, start_time, notes } = body;

  if (!name || !phone || !service_ids?.length || !scheduled_date || !start_time) {
    return c.json({ error: "Nome, telefone, serviços, data e horário são obrigatórios" }, 400);
  }

  // Find or create client by phone
  let client = await g("SELECT * FROM clients WHERE phone = $1", [phone]);
  if (!client) {
    const result = await r(
      "INSERT INTO clients (name, email, phone) VALUES ($1, $2, $3) RETURNING id",
      [name, email || "", phone],
    );
    client = await g("SELECT * FROM clients WHERE id = $1", [result.lastInsertRowid]);
  } else {
    // Update name if changed
    if (client.name !== name) {
      await r("UPDATE clients SET name = $1, updated_at = NOW() WHERE id = $2", [name, client.id]);
    }
  }

  // Calculate duration and price
  const svcs = await q(
    `SELECT id, duration, price FROM services WHERE id IN (${service_ids.map((_: number, i: number) => `$${i + 1}`).join(",")})`,
    service_ids,
  );
  const totalDuration = svcs.reduce((sum: number, s: any) => sum + (s.duration || 60), 0);
  const totalPrice = svcs.reduce((sum: number, s: any) => sum + (s.price || 0), 0);
  const endTime = addMinutes(start_time, totalDuration);
  const identifier = `APT-${Date.now()}`;

  const result = await r(
    `INSERT INTO appointments (identifier, client_id, staff_id, scheduled_date, start_time, end_time, total_price, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [identifier, client.id, staff_id || null, scheduled_date, start_time, endTime, totalPrice, notes || ""],
  );

  for (let i = 0; i < service_ids.length; i++) {
    const svc = svcs.find((s: any) => s.id === service_ids[i]) || svcs[i];
    if (svc) {
      await r(
        "INSERT INTO appointment_services (appointment_id, service_id, price, duration) VALUES ($1, $2, $3, $4)",
        [result.lastInsertRowid, service_ids[i], svc.price || 0, svc.duration || 60],
      );
    }
  }

  const apt = await g(
    `SELECT a.*, cl.name as client_name, cl.phone as client_phone,
            s.name as staff_name, s.color as staff_color
     FROM appointments a LEFT JOIN clients cl ON cl.id = a.client_id
     LEFT JOIN staff s ON s.id = a.staff_id WHERE a.id = $1`, [result.lastInsertRowid],
  );
  apt.services = await q(
    `SELECT aps.*, sv.name as service_name FROM appointment_services aps
     LEFT JOIN services sv ON sv.id = aps.service_id WHERE aps.appointment_id = $1`, [result.lastInsertRowid],
  );

  return c.json({ appointment: apt }, 201);
});

// ── Get bookings by phone ──
app.get("/api/public/bookings", async (c) => {
  const phone = c.req.query("phone") || "";
  if (!phone) return c.json({ appointments: [] });

  const client = await g("SELECT id FROM clients WHERE phone = $1", [phone]);
  if (!client) return c.json({ appointments: [] });

  const appointments = await q(
    `SELECT a.*, cl.name as client_name, cl.phone as client_phone,
            s.name as staff_name, s.color as staff_color
     FROM appointments a LEFT JOIN clients cl ON cl.id = a.client_id
     LEFT JOIN staff s ON s.id = a.staff_id
     WHERE a.client_id = $1 ORDER BY a.scheduled_date DESC, a.start_time DESC LIMIT 20`,
    [client.id],
  );

  for (const apt of appointments) {
    apt.services = await q(
      `SELECT aps.*, sv.name as service_name FROM appointment_services aps
       LEFT JOIN services sv ON sv.id = aps.service_id WHERE aps.appointment_id = $1`, [apt.id],
    );
  }

  return c.json({ appointments, client });
});

// ── Cancel booking by phone (public) ──
app.post("/api/public/bookings/:id/cancel", async (c) => {
  const { id } = c.req.param();
  const body: any = await c.req.json();
  const phone = body.phone || "";

  // Verify the booking belongs to this phone
  const apt = await g(
    `SELECT a.id, cl.phone FROM appointments a
     LEFT JOIN clients cl ON cl.id = a.client_id WHERE a.id = $1`, [id],
  );
  if (!apt) return c.json({ error: "Agendamento não encontrado" }, 404);
  if (apt.phone !== phone) return c.json({ error: "Este agendamento não pertence a este telefone" }, 403);

  await r("UPDATE appointments SET status = 'cancelled', updated_at = NOW() WHERE id = $1", [id]);
  return c.json({ ok: true });
});

// ── Complete profile (fidelity/loyalty) ──
app.put("/api/public/profile", async (c) => {
  const body: any = await c.req.json();
  const { phone } = body;
  if (!phone) return c.json({ error: "Telefone é obrigatório" }, 400);

  const client = await g("SELECT * FROM clients WHERE phone = $1", [phone]);
  if (!client) return c.json({ error: "Cliente não encontrado" }, 404);

  const { sets, params } = buildUpdate("clients", body);
  if (sets.length > 0) {
    sets.push("updated_at = NOW()");
    await r(`UPDATE clients SET ${sets.join(", ")} WHERE id = $${params.length + 1}`, [...params, client.id]);
  }

  const updated = await g("SELECT * FROM clients WHERE id = $1", [client.id]);
  return c.json({ client: updated });
});

export default app;
