import Link from 'next/link';

export default function Home() {
  return (
    <main className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden"
      style={{
        fontFamily: 'system-ui, sans-serif',
        background: 'radial-gradient(circle at 30% 20%, #1e0b3a 0%, #0a0118 50%, #000 100%)',
      }}>
      {/* Efectos de luz neón */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-50" style={{ background: '#ff2ec4' }} />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-40" style={{ background: '#00ffee' }} />

      <div className="relative z-10 text-center max-w-lg">
        {/* Logo / Título */}
        <div className="text-6xl mb-4">🎧</div>
        <h1 className="text-5xl font-black tracking-tight mb-2"
          style={{
            background: 'linear-gradient(90deg, #00ffee, #ff2ec4, #ffd700)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            textShadow: '0 0 40px rgba(0,255,238,0.3)',
          }}>
          MGL PRO AUDIO
        </h1>
        <p className="text-white/60 text-lg mb-8">Sistema de Pedidos DJ en Vivo</p>

        {/* Botones de acceso */}
        <div className="space-y-4">
          <Link href="/dj/pedir"
            className="block w-full p-4 rounded-xl text-black font-bold text-lg transition-transform hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(90deg, #00ffee, #ff2ec4)',
              boxShadow: '0 0 30px rgba(0,255,238,0.4)',
            }}>
            🎵 PEDIR CANCIÓN
          </Link>

          <Link href="/dj/admin"
            className="block w-full p-4 rounded-xl font-bold text-lg border transition-all hover:bg-white/5"
            style={{
              borderColor: 'rgba(0,255,238,0.4)',
              color: '#00ffee',
            }}>
            🎛️ PANEL DJ
          </Link>

          <Link href="/dj/pantalla"
            className="block w-full p-4 rounded-xl font-bold text-lg border transition-all hover:bg-white/5"
            style={{
              borderColor: 'rgba(255,46,196,0.4)',
              color: '#ff2ec4',
            }}>
            📺 PANTALLA EN VIVO
          </Link>
        </div>

        <p className="text-white/30 text-xs mt-10">
          Escaneá el QR o ingresá a /dj/pedir desde tu celular
        </p>
      </div>
    </main>
  );
}
