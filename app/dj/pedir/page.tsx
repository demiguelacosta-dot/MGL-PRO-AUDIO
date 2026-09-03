'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Suggestion = { text: string; thumb?: string; cover?: string; videoId?: string };

const stickers = ['🎉', '🔥', '❤️', '🥳', '🎶', '👏', '💃', '🕺', '🎂', '✨', '🙌', '💯'];

export default function Page() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [selectedThumbnail, setSelectedThumbnail] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Traer miniaturas usando la YouTube Data API v3 o, si falla, sugerencias de texto de Google
  async function fetchSuggestions(q: string) {
    if (timer.current) clearTimeout(timer.current);
    if (abortRef.current) abortRef.current.abort();

    const normalized = q.trim();
    if (normalized.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    timer.current = setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);

      try {
        const res = await fetch(`/api/search-suggestions?q=${encodeURIComponent(normalized)}`, {
          signal: ctrl.signal,
          cache: 'no-store',
        });

        if (!res.ok) throw new Error('suggestions fetch failed');

        const json = await res.json();
        const list: Suggestion[] = Array.isArray(json?.suggestions)
          ? json.suggestions
              .map((item: unknown) => {
                if (typeof item === 'string') {
                  return { text: item.trim() };
                }

                const entry = item as { text?: unknown; cover?: unknown; thumb?: unknown; videoId?: unknown } | null | undefined;
                const text = typeof entry?.text === 'string' ? entry.text.trim() : '';
                const cover = typeof entry?.cover === 'string' ? entry.cover : typeof entry?.thumb === 'string' ? entry.thumb : undefined;
                const videoId = typeof entry?.videoId === 'string' ? entry.videoId.trim() : undefined;
                return { text, cover, videoId };
              })
              .filter((item: Suggestion) => item.text.length > 0)
              .slice(0, 7)
          : [];

        setSuggestions(list);
        setOpen(list.length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 250);
  }

  function pick(s: Suggestion) {
    setQuery(s.text);
    setSelectedVideoId(s.videoId || '');
    setSelectedThumbnail(s.cover || s.thumb || '');
    setSuggestions([]);
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) { setError('Escribí el nombre de la canción.'); setStatus('error'); return; }
    setStatus('sending');

    const basePayload = {
      song: query.trim(),
      message: message.trim(),
    };

    const payload: {
      song: string;
      message: string;
      video_id?: string | null;
      thumbnail_url?: string | null;
    } = {
      ...basePayload,
      video_id: selectedVideoId || null,
      thumbnail_url: selectedThumbnail || null,
    };

    let { error: err } = await supabase.from('dj_requests').insert([payload]);

    if (err && (selectedVideoId || selectedThumbnail)) {
      const fallback = await supabase.from('dj_requests').insert([{ ...basePayload }]);
      err = fallback.error;
    }

    if (err) {
      setStatus('error');
      setError('Error al enviar. Intentalo de nuevo.');
      console.error(err);
      return;
    }

    setStatus('success');
    setQuery(''); setMessage(''); setSuggestions([]); setSelectedVideoId(''); setSelectedThumbnail('');
  }

  useEffect(() => () => { if (abortRef.current) abortRef.current.abort(); }, []);

  return (
    <main className="relative min-h-screen overflow-hidden flex items-center justify-center p-5"
      style={{
        fontFamily: 'system-ui, sans-serif',
        background: 'radial-gradient(circle at 20% 10%, #1e0b3a 0%, #0a0118 45%, #000 100%)',
        color: '#fff',
      }}>
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-60" style={{ background: '#ff2ec4' }} />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-50" style={{ background: '#00ffee' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl opacity-40" style={{ background: '#7b2fff' }} />

      <div className="absolute left-4 top-6 w-16 h-16 rounded-full opacity-40 animate-spin-slow"
        style={{ background: 'repeating-radial-gradient(circle, #111 0 6px, #222 6px 12px)', boxShadow: '0 0 20px #00ffee88' }} />
      <div className="absolute right-4 bottom-8 w-24 h-24 rounded-full opacity-40 animate-spin-slow-rev"
        style={{ background: 'repeating-radial-gradient(circle, #111 0 6px, #222 6px 12px)', boxShadow: '0 0 20px #ff2ec488' }} />

      <div className="relative w-full max-w-md rounded-3xl p-8 text-center"
        style={{
          background: 'linear-gradient(160deg, rgba(30,15,60,0.92), rgba(10,5,25,0.95))',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 0 0 1px rgba(0,255,238,0.15), 0 0 40px rgba(123,47,255,0.35), 0 20px 60px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)',
        }}>

        <div className="flex items-end justify-center gap-1.5 h-10 mb-4">
          {[0,1,2,3,4,5,6,7].map(i => (
            <span key={i} className="w-1.5 rounded-full bar" style={{ background: i % 2 ? '#00ffee' : '#ff2ec4' }} />
          ))}
        </div>

        <div className="text-4xl mb-1">🎧</div>
        <h1 className="text-3xl font-black tracking-wide mb-1"
          style={{ background: 'linear-gradient(90deg,#00ffee,#ff2ec4,#ffd700)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
          DJ MGL
        </h1>
        <p className="text-white/70 text-sm mb-6">PEDÍ TU CANCIÓN O DEJÁ UN SALUDO</p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="relative">
            <input
              value={query}
              onChange={e => {
                const value = e.target.value;
                setQuery(value);
                if (!value || value !== query) {
                  setSelectedVideoId('');
                  setSelectedThumbnail('');
                }
                fetchSuggestions(value);
              }}
              onFocus={() => {
                if (query.trim().length >= 2 || suggestions.length > 0) setOpen(true);
              }}
              onBlur={() => {
                setTimeout(() => setOpen(false), 150);
              }}
              placeholder="Escribí una canción o artista… 🎶"
              className="w-full p-4 pr-10 rounded-2xl text-white placeholder-white/40 outline-none transition"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">{loading ? '⟳' : '⌕'}</span>
            {loading && <span className="absolute right-10 top-1/2 -translate-y-1/2 text-white/40 spinner" />}

            {(open || suggestions.length > 0) && suggestions.length > 0 && (
              <ul className="absolute z-20 w-full mt-2 rounded-xl overflow-hidden max-h-72 overflow-y-auto"
                style={{ background: 'rgba(12,6,28,0.97)', border: '1px solid rgba(0,255,238,0.4)', boxShadow: '0 0 25px rgba(0,255,238,0.2)' }}>
                {suggestions.map((s, i) => (
                  <li key={`${s.text}-${i}`}>
                    <button type="button" onMouseDown={e => { e.preventDefault(); pick(s); }}
                      className="w-full text-left px-3 py-2 text-white/90 hover:bg-cyan-400/10 transition flex items-center gap-3">
                      {s.cover || s.thumb ? (
                        <img src={s.cover || s.thumb} alt="" className="w-10 h-10 object-cover rounded-lg ring-1 ring-white/10" loading="lazy" />
                      ) : (
                        <span className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 flex items-center justify-center text-emerald-300 text-xs font-bold">♫</span>
                      )}
                      <span className="truncate text-sm">{s.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <textarea name="message" rows={3} value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Tu mensaje / Saludo para el público 🗣️"
              className="w-full p-4 rounded-xl text-white placeholder:text-white/40 outline-none transition resize-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }} />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Stickers</span>
              {stickers.map(sticker => (
                <button
                  key={sticker}
                  type="button"
                  onClick={() => setMessage(current => `${current}${current ? ' ' : ''}${sticker}`)}
                  aria-label={`Agregar sticker ${sticker}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-lg transition hover:scale-110 hover:border-cyan-300/60 hover:bg-cyan-400/10"
                >
                  {sticker}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={status === 'sending'}
            className="w-full p-4 rounded-xl text-black font-extrabold text-lg tracking-wider transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            style={{
              background: 'linear-gradient(90deg,#00ffee,#ff2ec4)',
              boxShadow: '0 0 25px rgba(0,255,238,0.5), 0 0 40px rgba(255,46,196,0.35)',
            }}>
            {status === 'sending' ? 'ENVIANDO…' : '⚡ ENVIAR PEDIDO'}
          </button>
        </form>

        {status === 'success' && <p className="text-green-400 text-sm mt-5 font-semibold">✓ ¡Pedido enviado! Suena la música.</p>}
        {status === 'error' && <p className="text-red-400 text-sm mt-5 font-semibold">✕ {error}</p>}

        <p className="text-white/40 text-xs mt-6">Busca una canción y elige la opción correcta.</p>
      </div>

      <style>{`
        @keyframes spinSlow { from { transform: rotate(0) } to { transform: rotate(360deg) } }
        @keyframes spinSlowRev { from { transform: rotate(360deg) } to { transform: rotate(0) } }
        .animate-spin-slow { animation: spinSlow 12s linear infinite; }
        .animate-spin-slow-rev { animation: spinSlowRev 16s linear infinite; }
        @keyframes eq { 0%,100% { height: 20% } 50% { height: 100% } }
        .bar { animation: eq 0.9s ease-in-out infinite; transform-origin: bottom; }
        .bar:nth-child(even){ animation-delay: 0.2s }
        @keyframes rot { from { transform: rotate(0) } to { transform: rotate(360deg) } }
        .spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.25); border-top-color:#00ffee; border-radius: 50%; animation: rot 0.8s linear infinite; display:inline-block; }
        input:focus, textarea:focus { border-color:#00ffee !important; box-shadow: 0 0 15px rgba(0,255,238,0.35); }
      `}</style>
    </main>
  );
}