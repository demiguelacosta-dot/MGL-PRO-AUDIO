-- =============================================
-- MGL PRO AUDIO - Tabla de pedidos DJ
-- Ejecutar en el SQL Editor de Supabase
-- =============================================

-- Crear tabla de pedidos
CREATE TABLE IF NOT EXISTS dj_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  song TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'playing', 'done', 'cancelled')),
  video_id TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índice para consultas rápidas de pendientes
CREATE INDEX IF NOT EXISTS idx_dj_requests_status ON dj_requests(status, created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE dj_requests ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
-- Permitir inserción pública (cualquiera puede pedir canciones)
CREATE POLICY "Anyone can insert requests" ON dj_requests
  FOR INSERT WITH CHECK (true);

-- Permitir lectura pública (para mostrar estado en pantalla)
CREATE POLICY "Anyone can view requests" ON dj_requests
  FOR SELECT USING (true);

-- Solo usuarios autenticados pueden actualizar (el DJ marca como reproducido)
CREATE POLICY "Authenticated users can update requests" ON dj_requests
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Habilitar replicación para tiempo real (REALTIME)
ALTER PUBLICATION supabase_realtime ADD TABLE dj_requests;

-- Comentario descriptivo
COMMENT ON TABLE dj_requests IS 'Pedidos de canciones y saludos para eventos DJ - MGL PRO AUDIO';

-- =============================================
-- DATOS DE PRUEBA (opcional, comentar en producción)
-- =============================================
-- INSERT INTO dj_requests (song, message, status) VALUES
--   ('Despacito - Luis Fonsi', '¡Saludos a María en su cumple!', 'pending'),
--   ('Bailando - Enrique Iglesias', 'Para los chicos de la mesa 5', 'pending'),
--   ('Vivir Mi Vida - Marc Anthony', '', 'playing');
