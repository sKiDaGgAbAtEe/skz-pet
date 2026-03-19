/**
 * player.js — SKZOO Pet audio engine
 * Loads track list from songs.json, manages playback, exposes
 * events that wolf.js and health.js can listen to.
 *
 * Public API:
 *   Player.init()                → loads songs.json, builds UI
 *   Player.play(trackId)         → play a specific track by id
 *   Player.toggle()              → play/pause current track
 *   Player.next()                → advance to next track
 *   Player.prev()                → go to previous track
 *   Player.setVolume(0-1)        → set volume
 *
 * Events emitted on document:
 *   skzoo:trackStart  → { detail: track }
 *   skzoo:trackEnd    → { detail: track }
 *   skzoo:trackPause  → { detail: track }
 *   skzoo:trackResume → { detail: track }
 *   skzoo:beat        → { detail: { bpm, interval } }  (approx, from BPM)
 */

const Player = (() => {
  let tracks       = [];
  let currentIdx   = 0;
  let audio        = null;
  let beatTimer    = null;
  let isLoaded     = false;

  // ── Load tracks from JSON ─────────────────────────────────
  async function init() {
    try {
      const res  = await fetch('data/songs.json');
      const data = await res.json();
      tracks = data.tracks;
      isLoaded = true;
      buildUI();
      // Auto-load first track (but don't play)
      loadTrack(0, false);
    } catch (e) {
      console.error('[Player] Failed to load songs.json:', e);
    }
  }

  // ── Audio element setup ───────────────────────────────────
  function loadTrack(idx, autoplay = false) {
    if (!tracks.length) return;
    currentIdx = ((idx % tracks.length) + tracks.length) % tracks.length;
    const track = tracks[currentIdx];

    if (!audio) {
      audio = new Audio();
      audio.addEventListener('ended',  onEnded);
      audio.addEventListener('play',   onPlay);
      audio.addEventListener('pause',  onPause);
      audio.addEventListener('error',  onError);
    }

    stopBeat();
    audio.src = track.file;
    audio.load();
    updateUI();

    if (autoplay) {
      audio.play().then(() => {
        startBeat(track.bpm);
        emit('skzoo:trackStart', track);
      }).catch(e => console.warn('[Player] Autoplay blocked:', e));
    }
  }

  function play(trackId) {
    const idx = tracks.findIndex(t => t.id === trackId);
    if (idx !== -1) loadTrack(idx, true);
  }

  function toggle() {
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }

  function next()     { loadTrack(currentIdx + 1, !audio?.paused); }
  function prev()     { loadTrack(currentIdx - 1, !audio?.paused); }
  function setVolume(v) { if (audio) audio.volume = Math.max(0, Math.min(1, v)); }
  function isPlaying() { return audio && !audio.paused; }
  function current()   { return tracks[currentIdx] || null; }

  // ── Beat ticker (approximate, driven by BPM metadata) ────
  function startBeat(bpm) {
    stopBeat();
    if (!bpm) return;
    const interval = 60000 / bpm;
    beatTimer = setInterval(() => {
      emit('skzoo:beat', { bpm, interval });
    }, interval);
  }

  function stopBeat() {
    if (beatTimer) { clearInterval(beatTimer); beatTimer = null; }
  }

  // ── Audio event handlers ──────────────────────────────────
  function onPlay() {
    const track = tracks[currentIdx];
    startBeat(track?.bpm);
    emit('skzoo:trackResume', track);
    updateUI();
  }

  function onPause() {
    stopBeat();
    emit('skzoo:trackPause', tracks[currentIdx]);
    updateUI();
  }

  function onEnded() {
    stopBeat();
    emit('skzoo:trackEnd', tracks[currentIdx]);
    next(); // auto-advance
  }

  function onError(e) {
    console.warn('[Player] Audio error — check file path:', tracks[currentIdx]?.file, e);
  }

  // ── Event emitter helper ──────────────────────────────────
  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  // ── DOM UI ────────────────────────────────────────────────
  function buildUI() {
    const container = document.getElementById('PLAYER_UI');
    if (!container) return;

    container.innerHTML = `
      <div class="player-track-info">
        <div class="player-title" id="PLAYER_TITLE">—</div>
        <div class="player-album" id="PLAYER_ALBUM">—</div>
      </div>
      <div class="player-controls">
        <button class="player-btn" id="PLAYER_PREV" onclick="Player.prev()">&#9664;&#9664;</button>
        <button class="player-btn player-btn-main" id="PLAYER_TOGGLE" onclick="Player.toggle()">&#9654;</button>
        <button class="player-btn" id="PLAYER_NEXT" onclick="Player.next()">&#9654;&#9654;</button>
      </div>
      <div class="player-track-list" id="PLAYER_LIST"></div>
    `;

    buildTrackList();
    updateUI();
  }

  function buildTrackList() {
    const list = document.getElementById('PLAYER_LIST');
    if (!list) return;
    list.innerHTML = tracks.map((t, i) => `
      <div class="player-track-row ${i === currentIdx ? 'active' : ''}"
           id="PTRACK_${t.id}"
           onclick="Player.play('${t.id}')"
           style="--track-color: ${t.screenColor}">
        <span class="player-track-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="player-track-name">${t.title}</span>
        <span class="player-track-bpm">${t.bpm} BPM</span>
      </div>
    `).join('');
  }

  function updateUI() {
    const track = tracks[currentIdx];
    if (!track) return;

    const titleEl  = document.getElementById('PLAYER_TITLE');
    const albumEl  = document.getElementById('PLAYER_ALBUM');
    const toggleEl = document.getElementById('PLAYER_TOGGLE');

    if (titleEl)  titleEl.textContent  = track.title;
    if (albumEl)  albumEl.textContent  = `${track.album} · ${track.year}`;
    if (toggleEl) toggleEl.innerHTML   = audio?.paused ? '&#9654;' : '&#9646;&#9646;';

    // Highlight active track in list
    document.querySelectorAll('.player-track-row').forEach(row => row.classList.remove('active'));
    const activeRow = document.getElementById(`PTRACK_${track.id}`);
    if (activeRow) activeRow.classList.add('active');
  }

  // ── Public API ────────────────────────────────────────────
  return { init, play, toggle, next, prev, setVolume, isPlaying, current };
})();
