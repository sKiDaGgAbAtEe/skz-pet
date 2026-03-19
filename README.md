# SKZOO Pet 🐾

A fan-made Tamagotchi for STAYs. Take care of Wolf Chan, play 8-bit Stray Kids covers, and eventually collect every SKZOO member.

> **Fan project** — not affiliated with JYP Entertainment or Stray Kids.
> All music files are fan-made 8-bit covers. Character designs based on official SKZOO IP.

---

## Live site

**[skzoo.pet](https://your-username.github.io/skzoo-pet)** ← update after deploy

---

## Project structure

```
skzoo-pet/
├── index.html              # Entry point
├── css/
│   └── style.css           # All styles — device, wolf, player, controls
├── js/
│   ├── health.js           # Game state: health, decay, localStorage
│   ├── wolf.js             # Wolf Chan SVG + emotion controller
│   └── player.js           # Audio engine, loads from songs.json
├── data/
│   ├── songs.json          # Track list + metadata (BPM, mood, wolf reaction)
│   └── skzoo.json          # Character registry + outfit definitions
└── assets/
    ├── music/              # MP3 files — named to match songs.json file paths
    │   ├── wolfgang.mp3
    │   ├── backdoor.mp3
    │   ├── domino.mp3
    │   ├── losemybreath.mp3
    │   ├── sclass.mp3
    │   ├── lalalala.mp3
    │   └── megaverse.mp3
    ├── img/                # Album art, character art (future)
    └── audio/              # SFX (future)
```

---

## Getting started

### 1. Clone the repo
```bash
git clone https://github.com/your-username/skzoo-pet.git
cd skzoo-pet
```

### 2. Add your music files
Drop your 8-bit MP3 covers into `assets/music/`. File names must match exactly:
```
assets/music/wolfgang.mp3
assets/music/backdoor.mp3
assets/music/domino.mp3
assets/music/losemybreath.mp3
assets/music/sclass.mp3
assets/music/lalalala.mp3
assets/music/megaverse.mp3
```

### 3. Run locally
Open a local server (required — `fetch()` won't work from `file://`):
```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```
Then visit `http://localhost:8080`

### 4. Deploy to GitHub Pages
```bash
git add .
git commit -m "Initial release"
git push origin main
```
Then in your repo → **Settings → Pages → Source: main branch / root**.

---

## Adding a new song

1. Drop the MP3 into `assets/music/`
2. Add one object to `data/songs.json`:

```json
{
  "id": "008",
  "title": "YOUR SONG TITLE",
  "artist": "Stray Kids",
  "album": "Album Name",
  "year": 2024,
  "file": "assets/music/yourfile.mp3",
  "bpm": 140,
  "key": "A minor",
  "duration": 200,
  "energy": "high",
  "wolfReaction": "ecstatic",
  "screenColor": "#e84c6a",
  "tags": ["tag1", "tag2"],
  "notes": "Any notes about the track."
}
```

**`wolfReaction`** maps to Wolf Chan's emotion states:
`ecstatic` · `euphoric` · `happy` · `dancing` · `content` · `uncertain` · `sad` · `low`

**`screenColor`** tints the screen glow when the track plays.

No code changes needed — the player reads `songs.json` on load.

---

## Adding a new SKZOO character (future)

1. Add a character entry to `data/skzoo.json`
2. Create an SVG file for the character (following Wolf Chan's structure)
3. Register their outfits in the JSON

The health and player systems are already character-agnostic.

---

## Architecture

Three JS modules communicate through custom DOM events:

```
health.js  →  skzoo:healthChange  →  wolf.js  (updates emotion)
health.js  →  skzoo:moodChange    →  wolf.js  (updates emotion tier)
player.js  →  skzoo:trackStart    →  wolf.js  (tints screen with track color)
player.js  →  skzoo:beat          →  wolf.js  (future: BPM-sync dance speed)
```

**`health.js`** owns all game state. It persists to `localStorage` and applies offline decay when the page reloads — if you neglect Wolf Chan for an hour, he'll be sad when you come back.

**`wolf.js`** owns only the SVG and animation. It has no game state of its own — it only reads from `Health.get()` and responds to events.

**`player.js`** owns only audio. It reads `songs.json` once on init and exposes a clean API (`play`, `toggle`, `next`, `prev`).

---

## Roadmap

- [ ] BPM-synced dance animation speed
- [ ] Album art display in player
- [ ] More Wolf Chan outfits (MANIAC era, MIROH era)
- [ ] Second SKZOO member unlock
- [ ] Mobile PWA (add to home screen)
- [ ] Donation / fan support page

---

## Credits

Built with vanilla HTML, CSS, and JavaScript. No frameworks.
Fan art and character design inspired by official SKZOO characters by JYP Entertainment.
Music files are fan-made 8-bit covers — original songs by Stray Kids / JYP Entertainment.

**This project is not monetised and is not affiliated with JYP Entertainment.**
