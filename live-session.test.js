const test = require('node:test');
const assert = require('node:assert/strict');
const { getCurrentSong, isSameSong } = require('./lib/live-session');

test('selects the active song and ignores repeated polling of the same track', () => {
  const rows = [
    { id: 'a', status: 'pending', song: 'Primera', created_at: '2024-01-01T00:00:00Z' },
    { id: 'b', status: 'playing', song: 'Cancion actual', video_id: 'abc123', created_at: '2024-01-01T00:01:00Z' },
    { id: 'c', status: 'pending', song: 'Siguiente', created_at: '2024-01-01T00:02:00Z' },
  ];

  const current = getCurrentSong(rows);
  assert.equal(current.song, 'Cancion actual');
  assert.equal(isSameSong(current, { ...current }), true);
  assert.equal(isSameSong(current, { ...current, id: 'z' }), false);
});
