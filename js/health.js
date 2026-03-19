/**
 * health.js — SKZOO Pet game state
 * Manages health, decay, persistence, and emits state change events.
 *
 * Public API:
 *   Health.init()          → loads saved state, starts decay timer
 *   Health.feed()          → +1 health (max 5)
 *   Health.pet()           → +1 health (max 5)
 *   Health.sleep()         → pauses decay, sets sleeping flag
 *   Health.wake()          → resumes decay
 *   Health.get()           → returns current state object
 *   Health.save()          → persist to localStorage
 *
 * Events emitted on document:
 *   skzoo:healthChange  → { detail: { health, delta, sleeping } }
 *   skzoo:moodChange    → { detail: { mood } }   (fired when mood tier changes)
 */

const Health = (() => {
  const STORAGE_KEY    = 'skzoo-wolf-state';
  const MAX_HEALTH     = 5;
  const DECAY_INTERVAL = 30 * 1000;   // 1 heart per 30s while awake
  const SLEEP_DURATION = 2 * 60 * 1000; // auto-wake after 2 minutes

  let state = {
    health:       3,
    sleeping:     false,
    lastSaved:    Date.now(),
    outfit:       'default',
    musicOn:      false,
  };

  let decayTimer     = null;
  let sleepWakeTimer = null;

  // ── Mood ladder (maps health 0-5 → emotion name) ──────────
  const MOOD_FROM_HEALTH = {
    5: 'euphoric',
    4: 'happy',
    3: 'content',
    2: 'uncertain',
    1: 'sad',
    0: 'low',
  };

  function moodForHealth(h) {
    return MOOD_FROM_HEALTH[Math.max(0, Math.min(5, h))] || 'low';
  }

  // ── Initialise ────────────────────────────────────────────
  function init() {
    load();
    applyDecayForOfflineTime();
    startDecay();
    emit('skzoo:healthChange', { health: state.health, delta: 0, sleeping: state.sleeping });
  }

  // ── Offline decay: punish neglect realistically ───────────
  function applyDecayForOfflineTime() {
    if (state.sleeping) return; // no decay while sleeping
    const elapsed = Date.now() - state.lastSaved;
    const lost    = Math.floor(elapsed / DECAY_INTERVAL);
    if (lost > 0) {
      const prev = state.health;
      state.health = Math.max(0, state.health - lost);
      if (state.health !== prev) {
        emit('skzoo:healthChange', { health: state.health, delta: state.health - prev, sleeping: false });
      }
    }
  }

  // ── Decay timer ───────────────────────────────────────────
  function startDecay() {
    stopDecay();
    decayTimer = setInterval(() => {
      if (!state.sleeping && state.health > 0) {
        changeHealth(-1);
      }
    }, DECAY_INTERVAL);
  }

  function stopDecay() {
    if (decayTimer) { clearInterval(decayTimer); decayTimer = null; }
  }

  // ── Actions ───────────────────────────────────────────────
  function feed() {
    state.sleeping = false;
    changeHealth(+1);
  }

  function pet() {
    state.sleeping = false;
    changeHealth(+1);
  }

  function sleep() {
    state.sleeping = true;
    stopDecay();
    save();
    emit('skzoo:healthChange', { health: state.health, delta: 0, sleeping: true });
    // Auto-wake
    clearTimeout(sleepWakeTimer);
    sleepWakeTimer = setTimeout(() => {
      if (state.sleeping) wake();
    }, SLEEP_DURATION);
  }

  function wake() {
    clearTimeout(sleepWakeTimer);
    state.sleeping = false;
    startDecay();
    save();
    emit('skzoo:healthChange', { health: state.health, delta: 0, sleeping: false });
  }

  // ── Core health mutator ───────────────────────────────────
  function changeHealth(delta) {
    const prevMood   = moodForHealth(state.health);
    const prev       = state.health;
    state.health     = Math.max(0, Math.min(MAX_HEALTH, state.health + delta));
    const currentMood = moodForHealth(state.health);

    save();
    emit('skzoo:healthChange', { health: state.health, delta: state.health - prev, sleeping: state.sleeping });

    if (currentMood !== prevMood) {
      emit('skzoo:moodChange', { mood: currentMood });
    }
  }

  // ── Getters / setters ─────────────────────────────────────
  function get()               { return { ...state }; }
  function setOutfit(id)       { state.outfit = id; save(); }
  function setMusicOn(on)      { state.musicOn = on; save(); }
  function getMood()           { return moodForHealth(state.health); }

  // ── Persistence ───────────────────────────────────────────
  function save() {
    state.lastSaved = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[Health] localStorage unavailable:', e);
    }
  }

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
      }
    } catch (e) {
      console.warn('[Health] Could not load saved state:', e);
    }
  }

  // ── Event emitter ─────────────────────────────────────────
  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  return { init, feed, pet, sleep, wake, get, save, setOutfit, setMusicOn, getMood, moodForHealth };
})();
