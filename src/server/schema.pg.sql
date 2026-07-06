-- Clients (customers who book appointments)
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  birth_date TEXT DEFAULT '',
  cpf TEXT DEFAULT '',
  address TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  referral_source TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Staff members (stylists, therapists, technicians, etc.)
CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  specialties TEXT DEFAULT '',
  commission_rate DOUBLE PRECISION DEFAULT 0,
  hire_date TEXT DEFAULT '',
  title TEXT DEFAULT '',
  color TEXT NOT NULL DEFAULT '#7c3aed',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Services offered (haircut, massage, manicure, etc.)
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  duration INTEGER NOT NULL DEFAULT 60,
  price DOUBLE PRECISION NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#6b7280',
  category TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Appointments (bookings)
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  identifier TEXT NOT NULL UNIQUE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'booked',
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '10:00',
  total_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurrence_interval TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Services included in an appointment (many-to-many)
CREATE TABLE IF NOT EXISTS appointment_services (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  price DOUBLE PRECISION NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 60
);

-- Appointment notes / activity log
CREATE TABLE IF NOT EXISTS appointment_notes (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Blocked time slots (breaks, days off, lunch, etc.)
CREATE TABLE IF NOT EXISTS blocked_slots (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products (inventory: shampoo, creams, tools, etc.)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT DEFAULT '',
  category TEXT DEFAULT '',
  sku TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  price DOUBLE PRECISION NOT NULL DEFAULT 0,
  cost DOUBLE PRECISION NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  low_stock_alert INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Auto-incrementing identifier counter
CREATE TABLE IF NOT EXISTS _meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO _meta (key, value) VALUES ('appointment_counter', '0') ON CONFLICT (key) DO NOTHING;
INSERT INTO _meta (key, value) VALUES ('appointment_prefix', 'APT') ON CONFLICT (key) DO NOTHING;

-- Example staff
INSERT INTO staff (name, email, title, color)
SELECT name, email, title, color FROM (VALUES
  ('Alex', 'alex@example.com', 'Senior Stylist', '#3b82f6'),
  ('Jordan', 'jordan@example.com', 'Therapist', '#10b981'),
  ('Sam', 'sam@example.com', 'Specialist', '#f59e0b'),
  ('Taylor', 'taylor@example.com', 'Junior Stylist', '#8b5cf6')
) AS v(name, email, title, color)
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE name = v.name);

-- Example services
INSERT INTO services (name, description, duration, price, color, category)
SELECT name, description, duration, price, color, category FROM (VALUES
  ('Standard Session', 'Standard appointment', 60, 50, '#3b82f6', 'General'),
  ('Quick Service', 'Short appointment', 30, 30, '#10b981', 'General'),
  ('Premium Session', 'Extended premium service', 90, 85, '#8b5cf6', 'Premium'),
  ('Express Touch-up', 'Quick 15-minute service', 15, 20, '#f59e0b', 'Express'),
  ('Consultation', 'Initial consultation', 30, 0, '#6b7280', 'General'),
  ('Package Deal', 'Multiple services bundled', 120, 120, '#ec4899', 'Premium')
) AS v(name, description, duration, price, color, category)
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = v.name);

-- Example clients
INSERT INTO clients (name, email, phone)
SELECT name, email, phone FROM (VALUES
  ('Jamie Rivera', 'jamie@example.com', '555-0101'),
  ('Casey Morgan', 'casey@example.com', '555-0102'),
  ('Riley Chen', 'riley@example.com', '555-0103'),
  ('Dakota Smith', 'dakota@example.com', '555-0104')
) AS v(name, email, phone)
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = v.name);

-- Example products
INSERT INTO products (name, brand, category, price, cost, stock)
SELECT name, brand, category, price, cost, stock FROM (VALUES
  ('Professional Shampoo', 'ProCare', 'Hair Care', 24.99, 12.00, 25),
  ('Styling Gel', 'ProCare', 'Styling', 15.99, 7.50, 40),
  ('Moisturizing Cream', 'SkinLux', 'Skin Care', 32.99, 16.00, 18),
  ('Essential Oil Set', 'AromaPlus', 'Wellness', 45.99, 22.00, 12)
) AS v(name, brand, category, price, cost, stock)
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = v.name);

-- Alter existing tables for migration compatibility
ALTER TABLE clients ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS birth_date TEXT DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cpf TEXT DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS instagram TEXT DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS referral_source TEXT DEFAULT '';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT '';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS specialties TEXT DEFAULT '';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS commission_rate DOUBLE PRECISION DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS hire_date TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT '';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_staff ON appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointment_services_apt ON appointment_services(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_notes_apt ON appointment_notes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_staff ON blocked_slots(staff_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_date ON blocked_slots(blocked_date);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
