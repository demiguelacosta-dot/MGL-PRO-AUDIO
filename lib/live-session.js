function getCurrentSong(rows = []) {
  const playing = rows
    .filter((r) => r.status === 'playing')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (playing.length > 0) return playing[playing.length - 1];

  const pending = rows
    .filter((r) => r.status === 'pending')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return pending[pending.length - 1] || null;
}

function isSameSong(a, b) {
  if (!a || !b) return a === b;
  return String(a.id || '') === String(b.id || '') && String(a.video_id || '') === String(b.video_id || '') && String(a.song || '') === String(b.song || '');
}

module.exports = { getCurrentSong, isSameSong };
