# Daily English OS

A static, JSON-driven English learning website built for a 90-day fluency sprint.

## Learning model

Each day combines:

- mental model / core theory
- listening and pronunciation
- grammar as meaning
- native conversational chunks
- language deep dive
- spoken output
- 10–14 useful words/chunks
- shadowing practice

The goal is not only to know English, but to make English a usable second language.

## Static architecture

```text
index.html                         # GitHub Pages entry
home.html                          # main UI
styles.css / theory.css            # visual system
app-v2.js                          # lesson engine + local progress
assets/curriculum.json             # 90-day roadmap
assets/theory-atlas.json           # basic → advanced English knowledge map
assets/daily-vocab.json            # published lesson index
assets/lessons/day-001.json        # daily theory/practice content
assets/vocabulary/2026-08-18.json  # daily vocabulary/chunks
```

## Daily publishing contract

For each new day:

1. Create `assets/lessons/day-NNN.json`.
2. Create `assets/vocabulary/YYYY-MM-DD.json`.
3. Append one metadata object to `assets/daily-vocab.json` with `day`, `date`, `topic`, `lessonPath`, and `vocabPath`.
4. Never delete old daily files; they are the published learning history.
5. Prefer high-frequency spoken English, collocations and reusable chunks over rare vocabulary.
6. Every lesson should include listening/pronunciation, grammar/meaning, pragmatic/native usage, deep language insight and spoken output.

## Personal progress

The site remains fully static. Personal learning state is stored in browser `localStorage`:

- mastered vocabulary
- completed lessons
- speaking repetitions
- streak/session dates
- light/dark preference

Progress can be exported as JSON from the UI.

## GitHub Pages

`.github/workflows/pages.yml` deploys the repository through GitHub Pages on every push to `main`.
