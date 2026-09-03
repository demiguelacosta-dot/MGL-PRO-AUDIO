/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */

'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

function buildVideoEmbedUrl(videoId: string) {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=0&controls=0&playsinline=1&rel=0&modestbranding=1&showinfo=0&cc_load_policy=0&cc_lang_pref=es&hl=es&iv_load_policy=3&enablejsapi=1`;
}

function getSongSignature(song: any) {
  if (!song) return '';
  return `${song.id ?? ''}|${song.song ?? ''}|${song.video_id ?? ''}|${song.thumbnail_url ?? ''}`;
}

export default function PantallaVivo() {
  const [currentSong, setCurrentSong] = useState<any>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [previewVideoUrl, setPreviewVideoUrl] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [previewFailed, setPreviewFailed] = useState(false);
  const [forcedVideoId, setForcedVideoId] = useState('');
  const currentVideoUrlRef = useRef('');
  const currentSongSignatureRef = useRef('');
  const currentScreenKey = currentSong ? `${currentSong.id ?? 'song'}-${currentSong.song ?? ''}-${currentSong.message ?? ''}` : 'idle';

  async function fetchRequests() {
    const { data } = await supabase
      .from('dj_requests')
      .select('*')
      .in('status', ['pending', 'playing'])
      .order('created_at', { ascending: true });

    if (!data) return;

    const playingList = data.filter((r) => r.status === 'playing');
    const pendingList = data.filter((r) => r.status === 'pending');

    const playing = playingList
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .at(-1) || null;

    const fallbackPreview = pendingList
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .at(-1) || null;

    const nextSong = playing || fallbackPreview || null;
    const nextSignature = getSongSignature(nextSong);

    if (nextSignature !== currentSongSignatureRef.current) {
      currentSongSignatureRef.current = nextSignature;
      setCurrentSong(nextSong);
    }

    setPendingRequests(pendingList);
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const videoId = params.get('videoId') || '';
      const song = params.get('song') || '';
      if (videoId) setForcedVideoId(videoId);
      if (song && !currentSong) setCurrentSong({ song, message: '' });
    }
  }, []);

  useEffect(() => {
    async function loadPreview() {
      const selectedSong = currentSong?.song || '';
      const videoId = forcedVideoId || currentSong?.video_id || '';

      if (!selectedSong && !videoId) {
        setPreviewFailed(false);
        setPreviewVideoUrl('');
        setPreviewImageUrl('');
        currentVideoUrlRef.current = '';
        return;
      }

      if (videoId) {
        const nextImage = currentSong?.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        const nextVideoUrl = buildVideoEmbedUrl(videoId);

        if (currentVideoUrlRef.current === nextVideoUrl) {
          return;
        }

        currentVideoUrlRef.current = nextVideoUrl;
        setPreviewFailed(false);
        setPreviewImageUrl(nextImage);
        setPreviewVideoUrl(nextVideoUrl);
        return;
      }

      try {
        setPreviewFailed(false);
        const res = await fetch(`/api/search-suggestions?q=${encodeURIComponent(selectedSong)}`, {
          cache: 'no-store',
        });

        if (!res.ok) throw new Error('suggestions failed');

        const json = await res.json();
        const found = Array.isArray(json?.suggestions) ? json.suggestions.find((item: any) => item?.videoId) : null;
        const foundVideoId = found?.videoId || '';

        if (!foundVideoId) {
          currentVideoUrlRef.current = '';
          setPreviewVideoUrl('');
          setPreviewImageUrl('');
          return;
        }

        const nextImage = found?.cover || `https://img.youtube.com/vi/${foundVideoId}/maxresdefault.jpg`;
        const nextVideoUrl = buildVideoEmbedUrl(foundVideoId);

        if (currentVideoUrlRef.current === nextVideoUrl) {
          return;
        }

        currentVideoUrlRef.current = nextVideoUrl;
        setPreviewImageUrl(nextImage);
        setPreviewVideoUrl(nextVideoUrl);
      } catch {
        currentVideoUrlRef.current = '';
        setPreviewVideoUrl('');
        setPreviewImageUrl('');
      }
    }

    loadPreview();
  }, [currentSong, forcedVideoId]);

  useEffect(() => {
    fetchRequests();

    const pollingId = window.setInterval(() => {
      fetchRequests();
    }, 1500);

    const refreshLive = () => {
      fetchRequests();
    };

    const channel = supabase
      .channel('dj_requests_screen')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dj_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    if (typeof window !== 'undefined') {
      const bc = 'BroadcastChannel' in window ? new BroadcastChannel('mgl-live-screen') : null;
      if (bc) {
        bc.onmessage = (event) => {
          if (event.data?.type === 'refresh-live') refreshLive();
        };
      }

      const onStorage = (event: StorageEvent) => {
        if (event.key === 'mgl-live-screen-refresh') refreshLive();
      };

      window.addEventListener('storage', onStorage);

      return () => {
        window.clearInterval(pollingId);
        bc?.close();
        window.removeEventListener('storage', onStorage);
        supabase.removeChannel(channel);
      };
    }

    return () => {
      window.clearInterval(pollingId);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden"
      style={{
        fontFamily: 'system-ui, sans-serif',
        background: 'linear-gradient(135deg, #05070b 0%, #0b1220 30%, #0f172a 100%)',
        color: '#fff',
      }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(29,185,84,0.26),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.22),_transparent_28%)]" />

      <div className="relative z-10 flex min-h-screen flex-col p-6 md:p-10">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">live session</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white md:text-4xl">MGL PRO AUDIO</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#1ed760]/30 bg-[#1ed760]/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#d9ffe6] shadow-[0_0_20px_rgba(30,215,96,0.2)]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#1ed760] shadow-[0_0_16px_rgba(30,215,96,0.9)]" />
            en vivo
          </div>
        </header>

        {currentSong ? (
          <div key={currentScreenKey} className="screen-transition flex flex-1 flex-col gap-6 md:flex-row">
            <section className="relative min-w-0 flex-1 overflow-hidden rounded-[32px] border border-white/10 bg-[#0d1422]/85 shadow-[0_35px_120px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
              {(previewImageUrl || previewVideoUrl) && !previewFailed && (
                <>
                  {previewImageUrl && (
                    <div
                      className="absolute inset-0 scale-110 bg-cover bg-center opacity-60"
                      style={{
                        backgroundImage: `url(${previewImageUrl})`,
                        backgroundPosition: 'center center',
                        backgroundSize: 'cover',
                        filter: 'blur(1px) saturate(1.1) contrast(1.05)',
                      }}
                    />
                  )}

                  {previewVideoUrl && (
                    <div className="absolute inset-0 opacity-90 scale-105">
                      <iframe
                        src={previewVideoUrl}
                        title="Preview de YouTube"
                        className="pointer-events-none h-full w-full"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen={false}
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                        onError={() => setPreviewFailed(true)}
                        style={{ border: 0, filter: 'saturate(1.15) contrast(1.15) brightness(0.85)' }}
                      />
                    </div>
                  )}
                </>
              )}

              {!previewImageUrl && !previewVideoUrl ? (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(30,215,96,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.18),_transparent_32%),linear-gradient(135deg,_#0f172a,_#090d17)]" />
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.15),rgba(15,23,42,0.25),rgba(2,6,23,0.52))]" />
              )}

              <div className="relative z-10 flex h-full flex-col justify-between p-6 md:p-8">
                <div className="flex items-start justify-between pt-1">
                  <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.36em] text-white/75">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#1ed760] shadow-[0_0_18px_rgba(30,215,96,0.9)]" />
                    now playing
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">
                    live
                  </div>
                </div>

                <div className="flex items-end justify-between gap-6 pb-2">
                  <div className="flex w-[220px] shrink-0 items-center justify-center sm:w-[260px] md:w-[320px]">
                    <div className="w-full rounded-[28px] border border-white/5 bg-black/20 p-3 shadow-[0_0_30px_rgba(255,255,255,0.04)] backdrop-blur-sm">
                      <div className="mgl-logo-wrap">
                        <div className="mgl-logo">MGL</div>
                        <div className="mgl-logo-sub">PRO AUDIO</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1">
                    {currentSong.message && (
                      <p className="mt-3 max-w-2xl rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-base font-semibold italic leading-relaxed text-white shadow-[0_0_24px_rgba(255,255,255,0.12)] backdrop-blur-sm md:text-2xl md:leading-relaxed">
                        “{currentSong.message}”
                      </p>
                    )}

                    <div className="mt-5 flex items-end gap-2">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <span
                          key={i}
                          className="w-1.5 rounded-full bg-[#1ed760] opacity-80"
                          style={{
                            height: `${10 + ((i * 7) % 28)}px`,
                            animation: `eq ${0.8 + (i % 5) * 0.15}s ease-in-out infinite alternate`,
                            animationDelay: `${i * 0.06}s`,
                          }}
                        />
                      ))}
                    </div>

                    <h2 className="mt-4 line-clamp-2 max-w-2xl text-lg font-black leading-[1.08] tracking-[-0.03em] text-white drop-shadow-[0_0_20px_rgba(0,0,0,0.6)] md:text-2xl xl:text-3xl">
                      {currentSong.song}
                    </h2>
                  </div>
                </div>
              </div>
            </section>

            <aside className="flex h-[min(70vh,560px)] w-full shrink-0 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#0b1220]/85 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm md:h-auto md:max-h-[calc(100vh-180px)] md:w-[360px] md:max-w-[360px]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.32em] text-white/70">próximos</h3>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs font-bold text-white/80">{pendingRequests.length}</span>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {pendingRequests.map((req, idx) => (
                  <div
                    key={req.id}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1ed760]/15 text-sm font-black text-[#1ed760]">
                      #{idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{req.song}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                <img
                  src="/qr-pedir-mgl.svg"
                  alt="QR para pedir canciones"
                  className="mx-auto h-40 w-40 rounded-xl bg-white p-2"
                />
                <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-white">Pide tu canción</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/55">Escanea el código QR</p>
              </div>
            </aside>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="rounded-[28px] border border-dashed border-white/20 bg-white/5 px-8 py-12 text-center text-white/60">
              <div className="mb-4 text-6xl">🎧</div>
              <p className="text-2xl font-semibold">Sin reproducción activa</p>
              <p className="mt-2 text-sm uppercase tracking-[0.25em] text-white/45">esperando pedido</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes eq {
          0% { transform: scaleY(0.45); opacity: 0.5; }
          100% { transform: scaleY(1); opacity: 1; }
        }

        @keyframes screenFadeIn {
          0% {
            opacity: 0;
            transform: translateY(14px) scale(0.985);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .screen-transition {
          animation: screenFadeIn 0.5s ease forwards;
        }

        .mgl-logo-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          letter-spacing: -0.08em;
        }

        .mgl-logo {
          font-size: clamp(3.3rem, 6vw, 7rem);
          line-height: 0.8;
          font-weight: 900;
          letter-spacing: -0.12em;
          color: rgba(255,255,255,0.92);
          text-transform: uppercase;
          text-shadow:
            0 1px 0 rgba(255,255,255,0.8),
            0 2px 0 rgba(180,180,180,0.35),
            0 10px 16px rgba(10,10,20,0.85),
            inset 0 2px 2px rgba(255,255,255,0.7),
            inset 0 -10px 18px rgba(140,140,140,0.15);
          background: linear-gradient(180deg, #ffffff 0%, #dfe3ea 22%, #a8afba 50%, #f4f7fd 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .mgl-logo-sub {
          margin-top: 0.3rem;
          width: 100%;
          font-size: clamp(1.2rem, 2.1vw, 2.5rem);
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.06em;
          color: rgba(255,255,255,0.9);
          text-transform: uppercase;
          position: relative;
          padding-bottom: 0.5rem;
          text-shadow: 0 5px 14px rgba(0,0,0,0.5);
        }

        .mgl-logo-sub::before,
        .mgl-logo-sub::after {
          content: "";
          display: block;
          width: 78%;
          height: 0.18rem;
          margin: 0 auto 0.6rem auto;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.9) 18%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.9) 82%, transparent 100%);
          box-shadow: 0 0 10px rgba(255,255,255,0.28);
        }
      `}</style>
    </main>
  );
}
