-- ============================================================
--  OZ.LAVA RÁPIDO — Migration 14: Agendamentos
--  EXECUTE NO SUPABASE SQL EDITOR (Oz.Wash)
-- ============================================================

CREATE TABLE IF NOT EXISTS appointments (
  id          BIGSERIAL PRIMARY KEY,
  carwash_id  BIGINT NOT NULL REFERENCES carwashes(id) ON DELETE CASCADE,
  client_id   BIGINT REFERENCES clients(id)   ON DELETE SET NULL,
  vehicle_id  BIGINT REFERENCES vehicles(id)  ON DELETE SET NULL,
  employee_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
  service_id  BIGINT REFERENCES services(id)  ON DELETE SET NULL,
  date        DATE NOT NULL,
  time        TIME NOT NULL,
  notes       TEXT,
  status      TEXT DEFAULT 'agendado', -- agendado | confirmado | concluído | cancelado
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_carwash_id ON appointments(carwash_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date       ON appointments(carwash_id, date);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Admins e funcionários do lava rápido acessam seus agendamentos
CREATE POLICY "Tenant isolation - appointments"
ON appointments
FOR ALL
USING (
  carwash_id = (SELECT carwash_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  carwash_id = (SELECT carwash_id FROM profiles WHERE id = auth.uid())
);
