/**
 * player.js — SKZOO Pet audio engine v1.1
 * Loads track list from songs.json.
 * Falls back to scanning known filenames if fetch fails (e.g. file:// protocol).
 */

const Player = (() => {
  let tracks     = [];
  let currentIdx = 0;
  let audio      = null;
  let beatTimer  = null;

  // Fallback track list — used if songs.json can't be fetched
  const FALLBACK = [
    { id:'001', title:'WOLFGANG',        artist:'Stray Kids', album:'NOEASY',         year:2021, file:'assets/music/wolfgang.mp3',     bpm:162, screenColor:'#9b7fd4', wolfReaction:'ecstatic' },
    { id:'002', title:'Back Door',       artist:'Stray Kids', album:'IN LIFE',         year:2020, file:'assets/music/backdoor.mp3',     bpm:108, screenColor:'#e84c6a', wolfReaction:'dancing'  },
    { id:'003', title:'DOMINO',          artist:'Stray Kids', album:'NOEASY',         year:2021, file:'assets/music/domino.mp3',       bpm:160, screenColor:'#f5c842', wolfReaction:'ecstatic' },
    { id:'004', title:'Lose My Breath',  artist:'Stray Kids', album:'Single',          year:2023, file:'assets/music/losemybreath.mp3', bpm:133, screenColor:'#5dba6e', wolfReaction:'happy'    },
    { id:'005', title:'특 (S-Class)',    artist:'Stray Kids', album:'5-STAR',          year:2023, file:'assets/music/sclass.mp3',       bpm:160, screenColor:'#78d0e8', wolfReaction:'ecstatic' },
    { id:'006', title:'LALALALA',        artist:'Stray Kids', album:'Rock-Star',       year:2023, file:'assets/music/lalalala.mp3',     bpm:126, screenColor:'#ff9900', wolfReaction:'dancing'  },
    { id:'007', title:'MEGAVERSE',       artist:'Stray Kids', album:'Rock-Star',       year:2023, file:'assets/music/megaverse.mp3',    bpm:160, screenColor:'#b090e0', wolfReaction:'ecstatic' },
  ];

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    try {
      const res = await fetch('data/songs.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      tracks = data.tracks;
    } catch (e) {
      console.warn('[Player] songs.json unavailable, using fallback list:', e.message);
      tracks = FALLBACK;
    }
    buildUI();
    setupAudio();
    loadTrack(0, false);
  }

  // ── Create audio element once ─────────────────────────────
  function setupAudio() {
    if (audio) return;
    audio = new Audio();
    audio.volume = 0.8;
    audio.addEventListener('ended',  onEnded);
    audio.addEventListener('play',   onPlay);
    audio.addEventListener('pause',  onPause);
    audio.addEventListener('error',  onError);
  }

  // ── Load a track ──────────────────────────────────────────
  function loadTrack(idx, autoplay = false) {
    if (!tracks.length || !audio) return;
    currentIdx = ((idx % tracks.length) + tracks.length) % tracks.length;
    const track = tracks[currentIdx];

    stopBeat();
    audio.src = track.file;
    audio.load();
    updateUI();

    if (autoplay) {
      const promise = audio.play();
      if (promise !== undefined) {
        promise
          .then(() => {
            startBeat(track.bpm);
            emit('skzoo:trackStart', track);
          })
          .catch(e => console.warn('[Player] Play blocked by browser:', e.message));
      }
    }
  }

  // ── Public controls ───────────────────────────────────────
  function play(trackId) {
    const idx = tracks.findIndex(t => t.id === trackId);
    if (idx !== -1) loadTrack(idx, true);
  }

  function toggle() {
    if (!audio) { setupAudio(); loadTrack(0, true); return; }
    if (audio.paused) {
      audio.play()
        .then(() => { startBeat(tracks[currentIdx]?.bpm); })
        .catch(e => console.warn('[Player] Play blocked:', e.message));
    } else {
      audio.pause();
    }
  }

  function next() { loadTrack(currentIdx + 1, !audio?.paused); }
  function prev() { loadTrack(currentIdx - 1, !audio?.paused); }

  function setVolume(v) {
    if (audio) audio.volume = Math.max(0, Math.min(1, v));
  }

  function isPlaying() { return audio ? !audio.paused : false; }
  function current()   { return tracks[currentIdx] || null; }

  // ── Beat ticker ───────────────────────────────────────────
  function startBeat(bpm) {
    stopBeat();
    if (!bpm) return;
    beatTimer = setInterval(() => {
      emit('skzoo:beat', { bpm, interval: 60000 / bpm });
    }, 60000 / bpm);
  }

  function stopBeat() {
    if (beatTimer) { clearInterval(beatTimer); beatTimer = null; }
  }

  // ── Audio event handlers ──────────────────────────────────
  function onPlay()  { updateUI(); emit('skzoo:trackResume', tracks[currentIdx]); }
  function onPause() { stopBeat(); updateUI(); emit('skzoo:trackPause', tracks[currentIdx]); }
  function onEnded() { stopBeat(); emit('skzoo:trackEnd', tracks[currentIdx]); next(); }
  function onError(e) {
    const t = tracks[currentIdx];
    console.error('[Player] Could not load audio file:', t?.file, '— check the filename matches exactly.');
  }

  // ── Event helper ──────────────────────────────────────────
  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  // ── Player UI ─────────────────────────────────────────────
  function buildUI() {
    const container = document.getElementById('PLAYER_UI');
    if (!container) return;

    container.innerHTML = `
      <div class="player-track-info">
        <div class="player-title" id="PLAYER_TITLE">—</div>
        <div class="player-album" id="PLAYER_ALBUM">—</div>
      </div>
      <div class="player-controls">
        <button class="player-btn" onclick="Player.prev()">&#9664;&#9664;</button>
        <button class="player-btn player-btn-main" id="PLAYER_TOGGLE" onclick="Player.toggle()">&#9654;</button>
        <button class="player-btn" onclick="Player.next()">&#9654;&#9654;</button>
      </div>
      <input type="range" min="0" max="1" step="0.05" value="0.8"
        style="width:100%;margin-bottom:10px;accent-color:#8ecf8e;"
        oninput="Player.setVolume(this.value)">
      <div class="player-track-list" id="PLAYER_LIST"></div>
    `;

    buildTrackList();
  }

  function buildTrackList() {
    const list = document.getElementById('PLAYER_LIST');
    if (!list) return;
    list.innerHTML = tracks.map((t, i) => `
      <div class="player-track-row ${i === currentIdx ? 'active' : ''}"
           id="PTRACK_${t.id}"
           onclick="Player.play('${t.id}')"
           style="--track-color:${t.screenColor || '#8ecf8e'}">
        <span class="player-track-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="player-track-name">${t.title}</span>
        <span class="player-track-bpm">${t.bpm} BPM</span>
      </div>
    `).join('');
  }

  function updateUI() {
    const track    = tracks[currentIdx];
    const titleEl  = document.getElementById('PLAYER_TITLE');
    const albumEl  = document.getElementById('PLAYER_ALBUM');
    const toggleEl = document.getElementById('PLAYER_TOGGLE');

    if (titleEl && track)  titleEl.textContent = track.title;
    if (albumEl && track)  albumEl.textContent = `${track.album} · ${track.year}`;
    if (toggleEl) toggleEl.innerHTML = (audio && !audio.paused) ? '&#9646;&#9646;' : '&#9654;';

    document.querySelectorAll('.player-track-row').forEach(r => r.classList.remove('active'));
    if (track) {
      const row = document.getElementById(`PTRACK_${track.id}`);
      if (row) row.classList.add('active');
    }

    // Fire track color to Wolf screen glow
    if (track?.screenColor && audio && !audio.paused) {
      emit('skzoo:trackStart', track);
    }
  }

  return { init, play, toggle, next, prev, setVolume, isPlaying, current };
})();
