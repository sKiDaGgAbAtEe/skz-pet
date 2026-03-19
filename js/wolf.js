/**
 * wolf.js — Wolf Chan SVG animation and emotion controller
 * Listens to skzoo:healthChange, skzoo:trackStart, skzoo:beat events
 * and drives applyEmotion() accordingly.
 *
 * Depends on: health.js, player.js
 * wolf.js owns ONLY the SVG / animation layer — no game state.
 */

const Wolf = (() => {

  // ── DOM refs (set on init) ────────────────────────────────
  let GBODY, MOUTH, SNAME, MBARS, ZZZDOM, SCR, MUSICBTN, LSTICK, LSTICKBULB, LSTICKGLOW, LSTICKROW, PETHAND;

  // ── Emotion definitions ───────────────────────────────────
  const E = {
    ecstatic:  { stat:'ECSTATIC ♪',  moods:['(≧▽≦)!!!','꒰˶•ᵕ•˶꒱✨','≧◡≦ !!!'],       mouth:'M48 96 Q70 120 92 96', anim:null,                                             glow:['#78d0e8',.18], zzz:false, bars:true,  particles:['💎','✨','🌟','🐾'] },
    euphoric:  { stat:'SO HAPPY ♡',  moods:['(≧▽≦)♡','꒰˶•ᵕ•˶꒱','≧◡≦ !!!'],           mouth:'M50 96 Q70 118 90 96', anim:'happyJump .52s cubic-bezier(.34,1.56,.64,1) 3 forwards', glow:['#78d0e8',.16], zzz:false, bars:false, particles:['💎','✨','🌟','🐾'] },
    happy:     { stat:'HAPPY',        moods:['( ˘▽˘)♡','(•ᴗ•)','꒰˶•ᵕ•˶꒱'],            mouth:'M53 99 Q70 114 87 99', anim:'idleSway 3.2s ease-in-out infinite',             glow:['#7ab894',.10], zzz:false, bars:false, particles:[] },
    dancing:   { stat:'DANCING ♪',   moods:['≧◡≦ ♪','(ﾉ◕ヮ◕)ﾉ♪','꒰˶>ᗜ<˶꒱♩'],          mouth:'M52 97 Q70 115 88 97', anim:null,                                             glow:['#78d0e8',.12], zzz:false, bars:true,  particles:[] },
    ecstatic_dance: { stat:'ECSTATIC ♪', moods:['(≧▽≦)!!!','≧◡≦ ♪','꒰˶•ᵕ•˶꒱✨'],      mouth:'M48 96 Q70 120 92 96', anim:null,                                             glow:['#78d0e8',.18], zzz:false, bars:true,  particles:[] },
    content:   { stat:'IDLE',         moods:['( ˘▽˘)','(ᵔ◡ᵔ)','( •ᴗ•)','(˙ᵕ˙)'],      mouth:'M58 102 Q70 112 82 102',anim:'idleSway 3.2s ease-in-out infinite',            glow:['#8ecf8e',.07], zzz:false, bars:false, particles:[] },
    uncertain: { stat:'...',          moods:['(・・?)','...','(・_・?)','hmm'],            mouth:'M59 104 Q70 109 81 104',anim:'idleSway 4.8s ease-in-out infinite',            glow:['#4a6a5a',.05], zzz:false, bars:false, particles:[] },
    sad:       { stat:'SAD',          moods:['(╥_╥)','...','(T_T)',"i'm hungry"],       mouth:'M57 107 Q70 101 83 107',anim:'wolfDrift 5s ease-in-out infinite',             glow:['#3a4a6a',.08], zzz:false, bars:false, particles:['💧'] },
    low:       { stat:'NEGLECTED',    moods:['(._.)','...','please...','feed me'],        mouth:'M60 108 Q70 104 80 108',anim:'wolfExhausted 6s ease-in-out infinite',         glow:['#1a1a2e',.06], zzz:false, bars:false, particles:['💧'] },
    sleep:     { stat:'ZZZ',          moods:['(-_-)zzz','...zzzz','(－_－) z'],           mouth:'M60 105 Q70 103 80 105',anim:'LAYDOWN',                                        glow:['#3a5a8a',.10], zzz:true,  bars:false, particles:[] },
    fed:       { stat:'FULL ♡',       moods:['(≧◡≦)♡','mmm!','(˶ᵔᵕᵔ˶)♡','yummy!'],      mouth:'M52 97 Q70 115 88 97', anim:'wolfFed .8s ease-in-out 3 forwards',             glow:['#8ecf8e',.14], zzz:false, bars:false, particles:['🍖','💛','✨'] },
    petted:    { stat:'HAPPY ♡',      moods:['(˶ᵔᵕᵔ˶)','eee!','꒰˶•ᵕ•˶꒱','hehe'],        mouth:'M52 97 Q70 115 88 97', anim:'wolfFed .6s ease-in-out 3 forwards',             glow:['#8ecf8e',.12], zzz:false, bars:false, particles:['💖','🐾','⭐'] },
    wake:      { stat:'GOOD MORNING', moods:['(⌒▽⌒)','☀️ awake!','(≧▽≦)','morning!'],   mouth:'M52 97 Q70 115 88 97', anim:'happyJump .52s cubic-bezier(.34,1.56,.64,1) 3 forwards', glow:['#ffd93d',.14], zzz:false, bars:false, particles:['☀️','✨'] },
  };

  // ── Internal state ────────────────────────────────────────
  let currentState  = 'content';
  let musicOn       = false;
  let glowTimer     = null;
  let moodTO        = null;
  let stickActive   = false;
  let stickColor    = '#44aaff';

  // ── Init ──────────────────────────────────────────────────
  function init() {
    GBODY      = document.getElementById('GBODY');
    MOUTH      = document.getElementById('MOUTH');
    SNAME      = document.getElementById('SNAME');
    MBARS      = document.getElementById('MBARS');
    ZZZDOM     = document.getElementById('ZZZDOM');
    SCR        = document.getElementById('SCR');
    MUSICBTN   = document.getElementById('MUSICBTN');
    LSTICK     = document.getElementById('LSTICK');
    LSTICKBULB = document.getElementById('LSTICK_BULB');
    LSTICKGLOW = document.getElementById('LSTICK_GLOW');
    LSTICKROW  = document.getElementById('LSTICKROW');
    PETHAND    = document.getElementById('PETHAND');

    // Listen to health events
    document.addEventListener('skzoo:healthChange', e => {
      const { health, sleeping } = e.detail;
      if (sleeping) return; // sleep handled by act()
      syncMoodFromHealth(health);
    });

    document.addEventListener('skzoo:trackStart', e => {
      const track = e.detail;
      // Override screen glow with track color
      if (track.screenColor) setScreenGlow(track.screenColor, 0.14);
    });

    // Restore saved outfit on load
    const saved = Health.get();
    if (saved.outfit) setOutfitById(saved.outfit);
    if (saved.musicOn) {
      musicOn = true;
      if (MUSICBTN) MUSICBTN.textContent = '🔇';
    }

    syncMoodFromHealth(saved.health);
  }

  // ── Emotion helpers ───────────────────────────────────────
  function syncMoodFromHealth(health) {
    if (Health.get().sleeping) return;
    let name = Health.moodForHealth(health);
    if (musicOn) {
      name = health >= 5 ? 'ecstatic_dance' : 'dancing';
    }
    applyEmotion(name);
  }

  function applyEmotion(name) {
    const em = E[name];
    if (!em) return;
    currentState = name;

    // 1. Reset body
    GBODY.classList.remove('dancing', 'happy', 'sleepy', 'eyes-closed');
    GBODY.style.animation   = '';
    GBODY.style.transition  = '';

    // 2. ZZZ / music bars
    ZZZDOM.classList.toggle('on', !!em.zzz);
    MBARS.classList.toggle('on',  !!em.bars);

    // 3. Body animation
    const isDance = name === 'dancing' || name === 'ecstatic' || name === 'ecstatic_dance';
    if (isDance) {
      GBODY.classList.add('dance');
    } else if (em.anim === 'LAYDOWN') {
      doLaydown();
    } else if (name === 'wake') {
      doWakeAnim();
    } else if (em.anim) {
      GBODY.style.transformOrigin = '70px 165px';
      GBODY.style.animation       = em.anim;
    }

    // 4. Mouth
    MOUTH.setAttribute('d', em.mouth);

    // 5. Status + mood bubble
    SNAME.textContent = em.stat;
    showMood(em.moods[Math.floor(Math.random() * em.moods.length)]);

    // 6. Screen glow
    if (em.glow) setScreenGlow(...em.glow);

    // 7. Particles
    if (em.particles?.length) {
      const count = (name === 'euphoric' || name === 'ecstatic') ? 10 : 5;
      doBurst(em.particles, count);
    }

    // 8. Auto-return from timed states
    if (['fed','petted','wake'].includes(name)) {
      setTimeout(() => {
        if (currentState === name) syncMoodFromHealth(Health.get().health);
      }, 2200);
    }
  }

  // ── Lay-down / wake-up sequences ─────────────────────────
  function doLaydown() {
    GBODY.style.transformOrigin = '70px 165px';
    GBODY.style.animation       = 'wolfLaydown 0.9s cubic-bezier(.4,0,.2,1) forwards';
    setTimeout(() => GBODY.classList.add('eyes-closed'), 400);
    setTimeout(() => {
      if (currentState === 'sleep') {
        GBODY.style.animation = 'wolfLayIdle 4s ease-in-out infinite';
      }
    }, 950);
  }

  function doWakeAnim() {
    GBODY.classList.remove('eyes-closed');
    GBODY.style.transformOrigin = '70px 165px';
    GBODY.style.animation       = 'wolfWakeUp 0.7s cubic-bezier(.34,1.2,.64,1) forwards';
    setTimeout(() => {
      if (currentState === 'wake') {
        GBODY.classList.add('happy');
        GBODY.style.animation = '';
      }
    }, 720);
  }

  // ── Screen glow ───────────────────────────────────────────
  function setScreenGlow(col, intensity) {
    if (!SCR) return;
    clearTimeout(glowTimer);
    const a  = Math.round(intensity * 255).toString(16).padStart(2, '0');
    const a2 = Math.round(intensity * 0.4 * 255).toString(16).padStart(2, '0');
    SCR.style.transition  = 'box-shadow 1.2s ease';
    SCR.style.boxShadow   = `inset 0 0 50px ${col}${a}, inset 0 0 20px ${col}${a2}`;
    glowTimer = setTimeout(() => { SCR.style.boxShadow = 'none'; }, 9000);
  }

  // ── Mood bubble ───────────────────────────────────────────
  function showMood(t) {
    const el = document.getElementById('MOOD');
    if (!el) return;
    el.textContent = t;
    el.classList.add('show');
    clearTimeout(moodTO);
    moodTO = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // ── Particle burst ────────────────────────────────────────
  function doBurst(emojis, count) {
    for (let i = 0; i < count; i++) {
      const e = emojis[i % emojis.length];
      setTimeout(() => {
        const p       = document.createElement('div');
        p.className   = 'particle';
        p.textContent = e;
        p.style.left  = (75 + (Math.random() - .5) * 90) + 'px';
        p.style.bottom = (85 + Math.random() * 70) + 'px';
        p.style.fontSize = (11 + Math.random() * 9) + 'px';
        SCR.appendChild(p);
        setTimeout(() => p.remove(), 1300);
      }, i * 85);
    }
  }

  // ── Outfit ────────────────────────────────────────────────
  function setOutfitById(id) {
    ['default','karma','hoodie','nude'].forEach(n => {
      const el = document.getElementById('O' + n.charAt(0).toUpperCase() + n.slice(1) + 'G');
      if (el) el.classList.toggle('off', n !== id);
    });
  }

  function setOutfit(id, btn) {
    setOutfitById(id);
    document.querySelectorAll('.outfitbtn').forEach(b => b.classList.remove('on'));
    if (btn) btn.classList.add('on');
    Health.setOutfit(id);
    doBurst(['✨','👕'], 5);
  }

  // ── Lightstick ────────────────────────────────────────────
  function pickStick(btn) {
    const col   = btn.dataset.color;
    const wasOn = stickActive && stickColor === col;
    stickActive = !wasOn;
    stickColor  = col;
    document.querySelectorAll('.lstick-btn').forEach(b => {
      b.classList.remove('on');
      b.style.removeProperty('--lstick-col');
    });
    if (stickActive) {
      btn.classList.add('on');
      btn.style.setProperty('--lstick-col', col);
      if (LSTICKBULB) LSTICKBULB.setAttribute('fill', col);
      if (LSTICKGLOW) LSTICKGLOW.setAttribute('stroke', col);
      if (LSTICK)     LSTICK.style.opacity = '1';
    } else {
      if (LSTICK) LSTICK.style.opacity = '0';
    }
  }

  function setStickRowVisible(on) {
    if (LSTICKROW) LSTICKROW.classList.toggle('visible', on);
    if (!on) {
      stickActive = false;
      if (LSTICK) LSTICK.style.opacity = '0';
      document.querySelectorAll('.lstick-btn').forEach(b => b.classList.remove('on'));
    }
  }

  // ── Pet hand ──────────────────────────────────────────────
  function triggerPetHand() {
    if (!PETHAND) return;
    PETHAND.style.opacity = '1';
    PETHAND.classList.remove('petting');
    void PETHAND.offsetWidth;
    PETHAND.classList.add('petting');
    PETHAND.addEventListener('animationend', () => {
      PETHAND.classList.remove('petting');
      PETHAND.style.opacity = '0';
    }, { once: true });
  }

  // ── Button actions (called from HTML) ─────────────────────
  function act(action) {
    switch (action) {
      case 'feed':
        Health.feed();
        applyEmotion('fed');
        setTimeout(() => syncMoodFromHealth(Health.get().health), 2400);
        break;
      case 'pet':
        Health.pet();
        applyEmotion('petted');
        triggerPetHand();
        setTimeout(() => syncMoodFromHealth(Health.get().health), 2400);
        break;
      case 'music':
        if (Health.get().sleeping) return;
        musicOn = !musicOn;
        Health.setMusicOn(musicOn);
        if (MUSICBTN) MUSICBTN.textContent = musicOn ? '🔇' : '🎵';
        setStickRowVisible(musicOn);
        if (musicOn) {
          const h = Health.get().health;
          applyEmotion(h >= 5 ? 'ecstatic_dance' : 'dancing');
          if (!Player.isPlaying()) Player.toggle();
        } else {
          if (Player.isPlaying()) Player.toggle();
          syncMoodFromHealth(Health.get().health);
        }
        break;
      case 'sleep':
        musicOn = false;
        Health.setMusicOn(false);
        if (MUSICBTN) MUSICBTN.textContent = '🎵';
        setStickRowVisible(false);
        if (Player.isPlaying()) Player.toggle();
        Health.sleep();
        applyEmotion('sleep');
        break;
      case 'wake':
        Health.wake();
        applyEmotion('wake');
        setTimeout(() => syncMoodFromHealth(Health.get().health), 2400);
        break;
    }
  }

  // ── Ambient mood refresh ──────────────────────────────────
  setInterval(() => {
    if (!Health.get().sleeping) {
      const em = E[currentState];
      if (em) showMood(em.moods[Math.floor(Math.random() * em.moods.length)]);
    }
  }, 7000);

  return { init, act, applyEmotion, setOutfit, pickStick, setStickRowVisible };
})();
