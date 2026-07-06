import { Hono } from "hono";
import { initDB, query, get, run } from "./db-neon.js";

const app = new Hono();

app.use("*", async (_c, next) => {
  initDB();
  await next();
});

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

async function nextIdentifier(): Promise<string> {
  const prefix = await get<{ value: string }>("SELECT value FROM _meta WHERE key = 'appointment_prefix'");
  const counter = await get<{ value: string }>("SELECT value FROM _meta WHERE key = 'appointment_counter'");
  const next = parseInt(counter?.value || "0", 10) + 1;
  await run("UPDATE _meta SET value = ? WHERE key = 'appointment_counter'", [String(next)]);
  return `${prefix?.value || "APT"}-${next}`;
}

// ── Stats ──
app.get("/api/stats", async (c) => {
  const today = new Date().toISOString().split("T")[0];
  const appointments = await get<{ count: number }>("SELECT COUNT(*) as count FROM appointments");
  const clients = await get<{ count: number }>("SELECT COUNT(*) as count FROM clients");
  const staff = await get<{ count: number }>("SELECT COUNT(*) as count FROM staff WHERE active = 1");
  const services = await get<{ count: number }>("SELECT COUNT(*) as count FROM services WHERE active = 1");
  const products = await get<{ count: number }>("SELECT COUNT(*) as count FROM products");
  const todayAppointments = await get<{ count: number }>("SELECT COUNT(*) as count FROM appointments WHERE scheduled_date = ?", [today]);
  const upcomingAppointments = await get<{ count: number }>("SELECT COUNT(*) as count FROM appointments WHERE status IN ('booked', 'confirmed') AND scheduled_date >= ?", [today]);
  const completedAppointments = await get<{ count: number }>("SELECT COUNT(*) as count FROM appointments WHERE status = 'completed'");
  const revenue = await get<{ total: number }>("SELECT COALESCE(SUM(total_price), 0) as total FROM appointments WHERE status = 'completed'");
  const lowStock = await get<{ count: number }>("SELECT COUNT(*) as count FROM products WHERE stock <= low_stock_alert");
  return c.json({
    appointments: appointments?.count || 0,
    clients: clients?.count || 0,
    staff: staff?.count || 0,
    services: services?.count || 0,
    products: products?.count || 0,
    today_appointments: todayAppointments?.count || 0,
    upcoming_appointments: upcomingAppointments?.count || 0,
    completed_appointments: completedAppointments?.count || 0,
    revenue: revenue?.total || 0,
    low_stock_products: lowStock?.count || 0,
  });
});

// ── Calendar ──
app.get("/api/calendar", async (c) => {
  const start = c.req.query("start") || "";
  const end = c.req.query("end") || "";
  const appointments = await query<Record<string, unknown>>(
    `SELECT a.*, cl.name as client_name, cl.phone as client_phone,
            s.name as staff_name, s.color as staff_color
     FROM appointments a
     LEFT JOIN clients cl ON cl.id = a.client_id
     LEFT JOIN staff s ON s.id = a.staff_id
     WHERE a.scheduled_date >= ? AND a.scheduled_date <= ? AND a.status != 'cancelled'
     ORDER BY a.start_time ASC`,
    [start, end],
  );
  for (const apt of appointments) {
    const svcs = await query<Record<string, unknown>>(
      `SELECT aps.*, sv.name as service_name FROM appointment_services aps
       LEFT JOIN services sv ON sv.id = aps.service_id WHERE aps.appointment_id = ?`,
      [apt.id],
    );
    (apt as Record<string, unknown>).appointment_services = svcs;
  }
  const blocked = await query<Record<string, unknown>>(
    `SELECT b.*, s.name as staff_name FROM blocked_slots b
     LEFT JOIN staff s ON s.id = b.staff_id
     WHERE b.blocked_date >= ? AND b.blocked_date <= ? ORDER BY b.start_time ASC`,
    [start, end],
  );
  return c.json({ appointments, blocked_slots: blocked });
});

// ── Appointments List ──
app.get("/api/appointments", async (c) => {
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = (page - 1) * limit;
  const search = c.req.query("search");
  const status = c.req.query("status");
  const date = c.req.query("date");
  const staffId = c.req.query("staff_id");

  let where = "WHERE 1=1";
  const params: unknown[] = [];
  if (search) {
    where += " AND (a.identifier LIKE ? OR cl.name LIKE ?)";
    const s = `%${search}%`;
    params.push(s, s);
  }
  if (status) { where += " AND a.status = ?"; params.push(status); }
  if (date) { where += " AND a.scheduled_date = ?"; params.push(date); }
  if (staffId) { where += " AND a.staff_id = ?"; params.push(staffId); }

  const total = await get<{ count: number }>(
    `SELECT COUNT(*) as count FROM appointments a LEFT JOIN clients cl ON cl.id = a.client_id ${where}`, params,
  );
  const appointments = await query<Record<string, unknown>>(
    `SELECT a.*, cl.name as client_name, cl.phone as client_phone,
            s.name as staff_name, s.color as staff_color
     FROM appointments a LEFT JOIN clients cl ON cl.id = a.client_id
     LEFT JOIN staff s ON s.id = a.staff_id ${where}
     ORDER BY a.scheduled_date DESC, a.start_time ASC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return c.json({ appointments, total: total?.count || 0 });
});

// ── Appointment Detail ──
app.get("/api/appointments/:id", async (c) => {
  const { id } = c.req.param();
  const apt = await get<Record<string, unknown>>(
    `SELECT a.*, cl.name as client_name, cl.phone as client_phone,
            s.name as staff_name, s.color as staff_color
     FROM appointments a LEFT JOIN clients cl ON cl.id = a.client_id
     LEFT JOIN staff s ON s.id = a.staff_id WHERE a.id = ?`, [id],
  );
  if (!apt) return c.json({ error: "Not found" }, 404);
  const svcs = await query<Record<string, unknown>>(
    `SELECT aps.*, sv.name as service_name FROM appointment_services aps
     LEFT JOIN services sv ON sv.id = aps.service_id WHERE aps.appointment_id = ?`, [id],
  );
  apt.appointment_services = svcs;
  const notes = await query<Record<string, unknown>>(
    "SELECT * FROM appointment_notes WHERE appointment_id = ? ORDER BY created_at DESC", [id],
  );
  apt.appointment_notes = notes;
  return c.json({ appointment: apt });
});

// ── Create Appointment ──
app.post("/api/appointments", async (c) => {
  const body: any = await c.req.json();
  const identifier = await nextIdentifier();
  const startTime = body.start_time || "09:00";
  let totalDuration = 60;
  let totalPrice = 0;
  const serviceIds: number[] = body.service_ids || [];
  if (serviceIds.length > 0) {
    const svcs = await query<{ duration: number; price: number }>(
      `SELECT duration, price FROM services WHERE id IN (${serviceIds.map(() => "?").join(",")})`, serviceIds,
    );
    totalDuration = svcs.reduce((sum, s) => sum + s.duration, 0);
    totalPrice = svcs.reduce((sum, s) => sum + s.price, 0);
  }
  const endTime = addMinutes(startTime, totalDuration);
  const result = await run(
    `INSERT INTO appointments (identifier, client_id, staff_id, scheduled_date, start_time, end_time, total_price, notes, is_recurring, recurrence_interval)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [identifier, body.client_id, body.staff_id ?? null, body.scheduled_date, startTime, endTime, totalPrice, body.notes || "", body.is_recurring || 0, body.recurrence_interval || ""],
  );
  const aptId = result.lastInsertRowid;
  for (const svcId of serviceIds) {
    const svc = await get<{ duration: number; price: number }>("SELECT duration, price FROM services WHERE id = ?", [svcId]);
    if (svc) {
      await run("INSERT INTO appointment_services (appointment_id, service_id, price, duration) VALUES (?, ?, ?, ?)", [aptId, svcId, svc.price, svc.duration]);
    }
  }
  const apt = await get<Record<string, unknown>>(
    `SELECT a.*, cl.name as client_name, cl.phone as client_phone,
            s.name as staff_name, s.color as staff_color
     FROM appointments a LEFT JOIN clients cl ON cl.id = a.client_id
     LEFT JOIN staff s ON s.id = a.staff_id WHERE a.id = ?`, [aptId],
  );
  return c.json({ appointment: apt }, 201);
});

// ── Update Appointment ──
app.put("/api/appointments/:id", async (c) => {
  const { id } = c.req.param();
  const body: any = await c.req.json();
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (val !== undefined) { sets.push(`${key} = ?`); params.push(val); }
  }
  if (sets.length > 0) {
    sets.push("updated_at = NOW()");
    await run(`UPDATE appointments SET ${sets.join(", ")} WHERE id = ?`, [...params, id]);
  }
  return c.json({ ok: true });
});

// ── Delete Appointment ──
app.delete("/api/appointments/:id", async (c) => {
  const { id } = c.req.param();
  await run("DELETE FROM appointments WHERE id = ?", [id]);
  return c.json({ ok: true });
});

// ── Appointment Notes ──
app.post("/api/appointments/:id/notes", async (c) => {
  const { id } = c.req.param();
  const body: any = await c.req.json();
  await run("INSERT INTO appointment_notes (appointment_id, content) VALUES (?, ?)", [id, body.content]);
  return c.json({ ok: true }, 201);
});

app.delete("/api/notes/:id", async (c) => {
  const { id } = c.req.param();
  await run("DELETE FROM appointment_notes WHERE id = ?", [id]);
  return c.json({ ok: true });
});

// ── Clients List ──
app.get("/api/clients", async (c) => {
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = (page - 1) * limit;
  const search = c.req.query("search");
  let where = "WHERE 1=1";
  const params: unknown[] = [];
  if (search) {
    where += " AND (c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)";
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  const total = await get<{ count: number }>(`SELECT COUNT(*) as count FROM clients c ${where}`, params);
  const clients = await query<Record<string, unknown>>(
    `SELECT c.*, (SELECT COUNT(*) FROM appointments WHERE client_id = c.id) as appointment_count
     FROM clients c ${where} ORDER BY c.name ASC LIMIT ? OFFSET ?`, [...params, limit, offset],
  );
  return c.json({ clients, total: total?.count || 0 });
});

app.get("/api/clients/all", async (c) => {
  const clients = await query<{ id: number; name: string }>("SELECT id, name FROM clients ORDER BY name ASC");
  return c.json({ clients });
});

// ── Client Detail ──
app.get("/api/clients/:id", async (c) => {
  const { id } = c.req.param();
  const client = await get<Record<string, unknown>>("SELECT * FROM clients WHERE id = ?", [id]);
  if (!client) return c.json({ error: "Not found" }, 404);
  const appointments = await query<Record<string, unknown>>(
    `SELECT a.*, s.name as staff_name, s.color as staff_color
     FROM appointments a LEFT JOIN staff s ON s.id = a.staff_id
     WHERE a.client_id = ? ORDER BY a.scheduled_date DESC LIMIT 50`, [id],
  );
  return c.json({ client, appointments });
});

// ── Create Client ──
app.post("/api/clients", async (c) => {
  const body: any = await c.req.json();
  const result = await run("INSERT INTO clients (name, email, phone, notes) VALUES (?, ?, ?, ?) RETURNING id", [body.name, body.email || "", body.phone || "", body.notes || ""]);
  const client = await get<Record<string, unknown>>("SELECT * FROM clients WHERE id = ?", [result.lastInsertRowid]);
  return c.json({ client }, 201);
});

// ── Update Client ──
app.put("/api/clients/:id", async (c) => {
  const { id } = c.req.param();
  const body: any = await c.req.json();
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (val !== undefined) { sets.push(`${key} = ?`); params.push(val); }
  }
  if (sets.length > 0) {
    sets.push("updated_at = NOW()");
    await run(`UPDATE clients SET ${sets.join(", ")} WHERE id = ?`, [...params, id]);
  }
  return c.json({ ok: true });
});

// ── Delete Client ──
app.delete("/api/clients/:id", async (c) => {
  const { id } = c.req.param();
  await run("DELETE FROM clients WHERE id = ?", [id]);
  return c.json({ ok: true });
});

// ── Staff ──
app.get("/api/staff", async (c) => {
  const staff = await query<Record<string, unknown>>(
    `SELECT s.*, (SELECT COUNT(*) FROM appointments WHERE staff_id = s.id) as appointment_count FROM staff s ORDER BY s.name ASC`,
  );
  return c.json({ staff });
});

app.get("/api/staff/all", async (c) => {
  const staff = await query<{ id: number; name: string; color: string }>("SELECT id, name, color FROM staff WHERE active = 1 ORDER BY name ASC");
  return c.json({ staff });
});

app.post("/api/staff", async (c) => {
  const body: any = await c.req.json();
  const result = await run("INSERT INTO staff (name, email, phone, title, color) VALUES (?, ?, ?, ?, ?) RETURNING id", [body.name, body.email || "", body.phone || "", body.title || "", body.color || "#7c3aed"]);
  const staff = await get<Record<string, unknown>>("SELECT * FROM staff WHERE id = ?", [result.lastInsertRowid]);
  return c.json({ staff }, 201);
});

app.put("/api/staff/:id", async (c) => {
  const { id } = c.req.param();
  const body: any = await c.req.json();
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (val !== undefined) { sets.push(`${key} = ?`); params.push(val); }
  }
  if (sets.length > 0) await run(`UPDATE staff SET ${sets.join(", ")} WHERE id = ?`, [...params, id]);
  return c.json({ ok: true });
});

app.delete("/api/staff/:id", async (c) => {
  const { id } = c.req.param();
  await run("DELETE FROM staff WHERE id = ?", [id]);
  return c.json({ ok: true });
});

// ── Services ──
app.get("/api/services", async (c) => {
  const services = await query<Record<string, unknown>>("SELECT * FROM services ORDER BY category ASC, name ASC");
  return c.json({ services });
});

app.post("/api/services", async (c) => {
  const body: any = await c.req.json();
  const result = await run("INSERT INTO services (name, description, duration, price, color, category) VALUES (?, ?, ?, ?, ?, ?) RETURNING id", [body.name, body.description || "", body.duration || 60, body.price || 0, body.color || "#6b7280", body.category || ""]);
  const service = await get<Record<string, unknown>>("SELECT * FROM services WHERE id = ?", [result.lastInsertRowid]);
  return c.json({ service }, 201);
});

app.put("/api/services/:id", async (c) => {
  const { id } = c.req.param();
  const body: any = await c.req.json();
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (val !== undefined) { sets.push(`${key} = ?`); params.push(val); }
  }
  if (sets.length > 0) await run(`UPDATE services SET ${sets.join(", ")} WHERE id = ?`, [...params, id]);
  return c.json({ ok: true });
});

app.delete("/api/services/:id", async (c) => {
  const { id } = c.req.param();
  await run("DELETE FROM services WHERE id = ?", [id]);
  return c.json({ ok: true });
});

// ── Blocked Slots ──
app.post("/api/blocked-slots", async (c) => {
  const body: any = await c.req.json();
  await run("INSERT INTO blocked_slots (staff_id, blocked_date, start_time, end_time, reason) VALUES (?, ?, ?, ?, ?)", [body.staff_id, body.blocked_date, body.start_time, body.end_time, body.reason || ""]);
  return c.json({ ok: true }, 201);
});

app.delete("/api/blocked-slots/:id", async (c) => {
  const { id } = c.req.param();
  await run("DELETE FROM blocked_slots WHERE id = ?", [id]);
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
  const params: unknown[] = [];
  if (search) {
    where += " AND (p.name LIKE ? OR p.brand LIKE ? OR p.sku LIKE ?)";
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (category) { where += " AND p.category = ?"; params.push(category); }
  const total = await get<{ count: number }>(`SELECT COUNT(*) as count FROM products p ${where}`, params);
  const products = await query<Record<string, unknown>>(`SELECT * FROM products p ${where} ORDER BY p.name ASC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  return c.json({ products, total: total?.count || 0 });
});

app.post("/api/products", async (c) => {
  const body: any = await c.req.json();
  const result = await run("INSERT INTO products (name, brand, category, sku, price, cost, stock, low_stock_alert) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id", [body.name, body.brand || "", body.category || "", body.sku || "", body.price || 0, body.cost || 0, body.stock || 0, body.low_stock_alert || 5]);
  const product = await get<Record<string, unknown>>("SELECT * FROM products WHERE id = ?", [result.lastInsertRowid]);
  return c.json({ product }, 201);
});

app.put("/api/products/:id", async (c) => {
  const { id } = c.req.param();
  const body: any = await c.req.json();
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (val !== undefined) { sets.push(`${key} = ?`); params.push(val); }
  }
  if (sets.length > 0) {
    sets.push("updated_at = NOW()");
    await run(`UPDATE products SET ${sets.join(", ")} WHERE id = ?`, [...params, id]);
  }
  return c.json({ ok: true });
});

app.delete("/api/products/:id", async (c) => {
  const { id } = c.req.param();
  await run("DELETE FROM products WHERE id = ?", [id]);
  return c.json({ ok: true });
});

export default app;
