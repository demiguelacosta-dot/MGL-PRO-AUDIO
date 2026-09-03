/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DJAdmin() {
  const [requests, setRequests] = useState<any[]>([]);
  const [currentPlaying, setCurrentPlaying] = useState<any>(null);

  async function fetchRequests() {
    const { data, error } = await supabase
      .from('dj_requests')
      .select('*')
      .in('status', ['pending', 'playing'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch Error:', error);
      return;
    }

    const list = data || [];
    const playingList = list.filter((item) => item.status === 'playing');
    const latestPlaying = playingList.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).at(-1) || null;

    const activeQueue = list.filter((item) => item.status === 'pending' || item.status === 'playing');
    setRequests(activeQueue);
    setCurrentPlaying(latestPlaying);
  }

  async function markSongPlaying(id: string) {
    const { data: playingNow } = await supabase
      .from('dj_requests')
      .select('*')
      .eq('status', 'playing');

    if (playingNow && playingNow.length > 0) {
      const idsToClose = playingNow.map((item) => item.id).filter((itemId) => itemId !== id);
      if (idsToClose.length > 0) {
        await supabase.from('dj_requests').update({ status: 'done' }).in('id', idsToClose);
      }
    }

    const { error } = await supabase.from('dj_requests').update({ status: 'playing' }).eq('id', id);

    if (error) {
      console.error('Error al actualizar status:', error);
      alert('Error: ' + error.message);
      return;
    }

    await fetchRequests();
  }

  function notifyLiveScreen() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('mgl-live-screen-refresh', Date.now().toString());
    } catch {
      // ignore storage issues
    }

    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('mgl-live-screen');
      channel.postMessage({ type: 'refresh-live' });
      setTimeout(() => channel.close(), 100);
    }
  }

  async function playSongInLive(id: string) {
    await markSongPlaying(id);
    notifyLiveScreen();
  }

  async function closeCurrentSong() {
    if (!currentPlaying?.id) return;

    const { error } = await supabase
      .from('dj_requests')
      .update({ status: 'done' })
      .eq('id', currentPlaying.id);

    if (error) {
      console.error('Error cerrando canción actual:', error);
      alert('Error: ' + error.message);
      return;
    }

    await fetchRequests();
  }

  async function playSong(id: string) {
    const selected = requests.find((req) => req.id === id);
    const song = selected?.song || '';
    const videoId = selected?.video_id || '';

    await markSongPlaying(id);

    if (typeof window !== 'undefined') {
      if (videoId) {
        window.open(
          `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&rel=0&playsinline=1&modestbranding=1`,
          '_blank',
          'noopener,noreferrer'
        );
        return;
      }

      const query = encodeURIComponent((song || '').trim());
      if (query) {
        window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank', 'noopener,noreferrer');
      }
    }
  }

  function openYoutubeSearch(song: string) {
    const query = encodeURIComponent((song || '').trim());
    if (!query) return;
    window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank', 'noopener,noreferrer');
  }

  function openSpotifySearch(song: string) {
    const query = (song || '').trim();
    if (!query) return;
    window.open(`https://open.spotify.com/search/${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
  }

  async function dismissSong(id: string) {
    await supabase.from('dj_requests').update({ status: 'cancelled' }).eq('id', id);
    await fetchRequests();
  }

  useEffect(() => {
    fetchRequests();

    const intervalId = window.setInterval(() => {
      fetchRequests();
    }, 4000);

    const channel = supabase
      .channel('dj_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dj_requests' }, fetchRequests)
      .subscribe();

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_18%),linear-gradient(135deg,_#040a12_0%,_#08131d_20%,_#050b14_100%)] p-4 text-white md:p-6" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.38em] text-cyan-300/70">live control</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white md:text-4xl">Panel DJ</h1>
          </div>
          <div className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.18)]">
            {requests.length} pendientes
          </div>
        </header>

        {currentPlaying && (
          <div className="mb-6 overflow-hidden rounded-[30px] border border-emerald-400/30 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.28),_transparent_30%),linear-gradient(135deg,_rgba(6,182,212,0.12),_rgba(15,23,42,0.92),_rgba(15,23,42,1))] p-5 shadow-[0_30px_90px_rgba(16,185,129,0.14)] ring-1 ring-white/5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.35em] text-emerald-300">sonando ahora</div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.25em] text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
                  live
                </div>
                <button
                  type="button"
                  aria-label="Cerrar canción actual"
                  onClick={closeCurrentSong}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg font-bold text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  ×
                </button>
              </div>
            </div>
            {currentPlaying.thumbnail_url && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                <img src={currentPlaying.thumbnail_url} alt={currentPlaying.song} className="h-24 w-full object-cover md:h-32" />
              </div>
            )}
            <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-white md:text-4xl">{currentSongTitle(currentPlaying.song)}</p>
            {currentPlaying.message && (
              <div className="mt-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.08)]">
                <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.26em] text-amber-300">dedicatoria</span>
                <span className="font-medium">{currentPlaying.message}</span>
              </div>
            )}
          </div>
        )}

        <div className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.02] shadow-[0_24px_90px_rgba(2,6,23,0.4)] backdrop-blur-sm">
          <div className="grid grid-cols-[1fr_auto] items-center border-b border-white/10 bg-white/[0.03] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.28em] text-slate-300 md:px-5">
            <span>pedido</span>
            <span className="text-right">acciones</span>
          </div>

          <div className="space-y-2 p-2 md:p-3">
            {requests.map((req, index) => (
              <div
                key={req.id}
                className={`grid grid-cols-1 gap-3 rounded-2xl border p-3 transition md:grid-cols-[1fr_auto] md:items-center ${
                  req.status === 'playing'
                    ? 'border-emerald-400/40 bg-emerald-500/10 shadow-[0_0_18px_rgba(16,185,129,0.10)]'
                    : 'border-white/10 bg-[#0d1320] hover:border-cyan-400/20 hover:bg-[#101a2a]'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-black shadow-[0_0_18px_rgba(34,211,238,0.12)] ${
                    req.status === 'playing'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-cyan-500/15 text-cyan-300'
                  }`}>
                    {req.status === 'playing' ? 'LIVE' : `#${index + 1}`}
                  </div>
                  {req.thumbnail_url && (
                    <img src={req.thumbnail_url} alt={req.song} className="h-10 w-10 rounded-lg object-cover ring-1 ring-white/10" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white md:text-base">{req.song}</p>
                    {req.message && (
                      <p className="mt-1 line-clamp-2 text-xs italic text-slate-300">
                        “{req.message}”
                      </p>
                    )}
                    {req.status === 'playing' && (
                      <span className="mt-1 inline-block rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                        sonando
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 md:justify-end">
                  <button type="button" onClick={() => playSong(req.id)} className="rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white transition hover:bg-blue-500">
                    Reproducir
                  </button>
                  <button type="button" onClick={() => playSongInLive(req.id)} className="rounded-lg bg-amber-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white transition hover:bg-amber-500">
                    Pantalla
                  </button>
                  <button type="button" onClick={() => openSpotifySearch(req.song)} className="rounded-lg bg-green-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white transition hover:bg-green-500">
                    Spotify
                  </button>
                  <button type="button" onClick={() => openYoutubeSearch(req.song)} className="rounded-lg bg-red-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white transition hover:bg-red-500">
                    YouTube
                  </button>
                  <button type="button" onClick={() => dismissSong(req.id)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white transition hover:bg-white/10">
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function currentSongTitle(song: string) {
  return song || 'Sin título';
}
