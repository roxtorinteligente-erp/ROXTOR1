-- SQL para configurar la tabla de sincronización de ROXTOR ERP en Supabase

-- 1. Crear la tabla roxtor_sync
CREATE TABLE IF NOT EXISTS roxtor_sync (
  id BIGSERIAL PRIMARY KEY,
  store_id TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE roxtor_sync ENABLE ROW LEVEL SECURITY;

-- 3. Crear política para permitir acceso total (Para prototipos)
-- NOTA: En producción, deberías restringir esto por autenticación.
CREATE POLICY "Permitir todo a roxtor_sync" ON roxtor_sync
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Insertar registro inicial para la sede principal si no existe
INSERT INTO roxtor_sync (store_id, payload)
VALUES ('global_master', '{}')
ON CONFLICT (store_id) DO NOTHING;
