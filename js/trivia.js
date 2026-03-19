/**
 * trivia.js — SKZOO Trivia Game
 *
 * Loads questions from data/trivia.json.
 * In trivia mode the 4 action buttons (Feed/Pet/Music/Sleep) become
 * answer buttons A / B / C / D. Wake button = skip question.
 *
 * Public API:
 *   Trivia.init()      → loads trivia.json
 *   Trivia.start()     → begin a game session
 *   Trivia.stop()      → exit trivia mode, restore normal buttons
 *   Trivia.active()    → returns true if trivia mode is running
 *
 * Events emitted on document:
 *   skzoo:triviaStart   → game begins
 *   skzoo:triviaEnd     → { detail: { score, total } }
 *   skzoo:triviaCorrect → { detail: { question } }
 *   skzoo:triviaWrong   → { detail: { question, chosen } }
 */

const Trivia = (() => {
  let questions    = [];
  let queue        = [];
  let current      = null;
  let score        = 0;
  let isActive     = false;
  let answerLocked = false;

  // ── Load questions ────────────────────────────────────────
  async function init() {
    try {
      const res  = await fetch('data/trivia.json');
      const data = await res.json();
      questions = data.questions;
    } catch (e) {
      console.error('[Trivia] Failed to load trivia.json:', e);
    }
  }

  // ── Game flow ─────────────────────────────────────────────
  function start() {
    if (!questions.length) { console.warn('[Trivia] No questions loaded'); return; }
    isActive     = true;
    answerLocked = false;
    score        = 0;
    // Shuffle and take all questions
    queue = [...questions].sort(() => Math.random() - 0.5);
    document.dispatchEvent(new CustomEvent('skzoo:triviaStart'));
    enterTriviaUI();
    nextQuestion();
  }

  function stop() {
    isActive = false;
    exitTriviaUI();
    document.dispatchEvent(new CustomEvent('skzoo:triviaEnd', {
      detail: { score, total: questions.length }
    }));
  }

  function nextQuestion() {
    if (!queue.length) { stop(); return; }
    answerLocked = false;
    current      = queue.shift();
    // Shuffle answer order so correct isn't always first
    const shuffled = shuffleAnswers(current);
    renderQuestion(shuffled);
  }

  function shuffleAnswers(q) {
    const indexed = q.answers.map((a, i) => ({ text: a, originalIndex: i }));
    indexed.sort(() => Math.random() - 0.5);
    return { ...q, shuffled: indexed };
  }

  function answer(slot) {  // slot = 0,1,2,3 matching button position
    if (!isActive || answerLocked || !current) return;
    answerLocked = true;

    const shuffled   = current._shuffled;
    const chosen     = shuffled[slot];
    const isCorrect  = chosen.originalIndex === current.correct;

    if (isCorrect) {
      score++;
      markAnswer(slot, 'correct');
      Wolf.applyEmotion('euphoric');
      Health.feed(); // correct answer = +1 health
      document.dispatchEvent(new CustomEvent('skzoo:triviaCorrect', { detail: { question: current } }));
    } else {
      markAnswer(slot, 'wrong');
      markAnswer(current._shuffled.findIndex(a => a.originalIndex === current.correct), 'reveal');
      Wolf.applyEmotion('sad');
      document.dispatchEvent(new CustomEvent('skzoo:triviaWrong', { detail: { question: current, chosen } }));
    }

    // Advance after 1.6s
    setTimeout(() => {
      if (isActive) nextQuestion();
    }, 1600);
  }

  function skip() {
    if (!isActive || answerLocked) return;
    answerLocked = true;
    // Show correct answer briefly
    const correctSlot = current._shuffled?.findIndex(a => a.originalIndex === current.correct);
    if (correctSlot !== undefined) markAnswer(correctSlot, 'reveal');
    setTimeout(() => {
      if (isActive) nextQuestion();
    }, 1200);
  }

  // ── UI ────────────────────────────────────────────────────
  function enterTriviaUI() {
    // Show trivia overlay on screen
    const scr = document.getElementById('SCR');
    if (!scr) return;

    let overlay = document.getElementById('TRIVIA_OVERLAY');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'TRIVIA_OVERLAY';
      scr.appendChild(overlay);
    }
    overlay.style.display = 'flex';

    // Swap button labels
    setButtonMode('trivia');
  }

  function exitTriviaUI() {
    const overlay = document.getElementById('TRIVIA_OVERLAY');
    if (overlay) overlay.style.display = 'none';
    setButtonMode('normal');

    // Show final score
    showScore();
  }

  function renderQuestion(q) {
    current._shuffled = q.shuffled;
    const remaining   = queue.length + 1;
    const total       = questions.length;
    const qNum        = total - remaining + 1;

    const overlay = document.getElementById('TRIVIA_OVERLAY');
    if (!overlay) return;

    overlay.innerHTML = `
      <div class="trivia-progress">${qNum} / ${total} · Score: ${score}</div>
      <div class="trivia-question">${q.text}</div>
      <div class="trivia-answers">
        ${q.shuffled.map((a, i) => `
          <div class="trivia-answer" id="TANS_${i}" data-slot="${i}">
            <span class="trivia-letter">${'ABCD'[i]}</span>
            <span class="trivia-text">${a.text}</span>
          </div>
        `).join('')}
      </div>
    `;

    // Update button labels to A/B/C/D with answer text (truncated)
    ['A','B','C','D'].forEach((letter, i) => {
      const btn = document.getElementById(`TRIVIA_BTN_${i}`);
      if (btn) {
        btn.querySelector('.trivia-btn-letter').textContent = letter;
        btn.querySelector('.trivia-btn-text').textContent  = q.shuffled[i]?.text?.substring(0,18) || '';
      }
    });

    updateSkipBtn(remaining);
  }

  function markAnswer(slot, type) {
    const el = document.getElementById(`TANS_${slot}`);
    if (!el) return;
    el.classList.add(`trivia-${type}`);
    const btn = document.getElementById(`TRIVIA_BTN_${slot}`);
    if (btn) btn.classList.add(`trivia-btn-${type}`);
  }

  function showScore() {
    const pct    = Math.round((score / questions.length) * 100);
    const rating = pct === 100 ? '🐺 Hard Stan confirmed!' :
                   pct >= 80   ? '🌟 Solid STAY!' :
                   pct >= 60   ? '💚 Learning the lore!' :
                   pct >= 40   ? '📖 Keep watching SKZ content' :
                                 '👶 Baby STAY — welcome!';

    const overlay = document.getElementById('TRIVIA_OVERLAY');
    if (!overlay) return;
    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <div class="trivia-score-screen">
        <div class="trivia-score-num">${score} / ${questions.length}</div>
        <div class="trivia-score-pct">${pct}%</div>
        <div class="trivia-score-label">${rating}</div>
        <button class="trivia-score-close" onclick="Trivia.dismissScore()">✕ Close</button>
      </div>
    `;
  }

  function dismissScore() {
    const overlay = document.getElementById('TRIVIA_OVERLAY');
    if (overlay) overlay.style.display = 'none';
  }

  function updateSkipBtn(remaining) {
    const skipBtn = document.getElementById('TRIVIA_SKIP');
    if (skipBtn) skipBtn.textContent = remaining <= 1 ? '✓ Finish' : '→ Skip';
  }

  // ── Button mode switching ─────────────────────────────────
  function setButtonMode(mode) {
    const normalBtns  = document.getElementById('NORMAL_BTNS');
    const triviaBtns  = document.getElementById('TRIVIA_BTNS');
    if (!normalBtns || !triviaBtns) return;

    if (mode === 'trivia') {
      normalBtns.style.display = 'none';
      triviaBtns.style.display = 'flex';
    } else {
      normalBtns.style.display = 'flex';
      triviaBtns.style.display = 'none';
    }
  }

  // ── Helpers ───────────────────────────────────────────────
  function active() { return isActive; }

  return { init, start, stop, answer, skip, active, dismissScore };
})();
