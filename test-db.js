// Script de prueba para verificar la conexión a Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Verificando conexión a Supabase...');
console.log('URL:', supabaseUrl ? '✅ Configurado' : '❌ Falta');
console.log('Key:', supabaseKey ? '✅ Configurado' : '❌ Falta');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Intentar leer la tabla dj_requests
    const { data, error } = await supabase
      .from('dj_requests')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Error:', error.message);
      console.log('\n📝 Necesitas crear la tabla dj_requests en Supabase');
      console.log('Ejecuta este SQL en el SQL Editor de Supabase:\n');
      console.log(`
CREATE TABLE IF NOT EXISTS dj_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  song TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE dj_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert requests" ON dj_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view requests" ON dj_requests FOR SELECT USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE dj_requests;
      `);
      return;
    }
    
    console.log('✅ Conexión exitosa!');
    console.log('📊 Tabla dj_requests existe');
    console.log('Datos actuales:', data);
    
    // Probar insertar un registro de prueba
    const { error: insertError } = await supabase
      .from('dj_requests')
      .insert([{ song: 'TEST - Canción de prueba', message: 'Prueba de sistema' }]);
    
    if (insertError) {
      console.log('❌ Error al insertar:', insertError.message);
    } else {
      console.log('✅ Insert de prueba exitoso');
    }
    
  } catch (e) {
    console.log('❌ Error de conexión:', e.message);
  }
}

testConnection();
