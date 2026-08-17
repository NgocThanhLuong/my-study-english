# Daily English OS — Guarded Daily Content Workflow

This repository is a 90-day append-only learning journal. Daily content must be created as a reviewed learning progression, not as isolated generated JSON.

## Non-negotiable principles

1. **Never lose history.** Existing `assets/lessons/`, `assets/vocabulary/`, and `assets/tests/` daily files are immutable after publication except for an explicit correction with a clearly named fix commit.
2. **One new learning day must build on previous days.** New content must be checked against the published archive, the curriculum, the content policy, and the content ledger before drafting.
3. **Communication first, depth always.** Prioritize listening, speaking, chunks, collocation, grammar-as-meaning, pragmatics, discourse, pronunciation, and language-system understanding over exam-style memorization.
4. **Review is intentional.** Repeated language is allowed only when it is planned retrieval, contrast, expansion, or transfer to a new situation.
5. **No fabricated sourcing.** A named dictionary/corpus/reference may be cited only when actually checked.
6. **Teach form → meaning → use.** Any important grammar or expression should answer: What form is this? What meaning/viewpoint does it create? Why would a speaker choose it here?

## Daily publishing pipeline

### Gate 0 — Integrity check

Before writing anything:

- Read `assets/daily-vocab.json`.
- Read `assets/curriculum.json`.
- Read `assets/content-policy.json`.
- Read `assets/content-ledger.json`.
- Confirm the next day and date do not already exist.
- Confirm all previously indexed lesson/vocab/test paths still exist.
- Abort publication rather than overwrite an existing daily file.

### Gate 1 — Review the learning history

At minimum review:

- the immediately previous **3 published days** in full;
- vocabulary/chunks from the previous **7 days** via the ledger/archive;
- relevant older material scheduled for spaced retrieval (roughly 7/14/30-day intervals where available);
- all prior occurrences of the main grammar/sound/pragmatic concept being introduced today.

Build a short internal preflight inventory:

- what the learner already knows;
- what is still fragile or deserves retrieval;
- what must not be duplicated as "new";
- what today's topic should add;
- which earlier items can be reused naturally.

### Gate 2 — Select today's scope

Use the day's roadmap topic as the spine, but adapt depth to the learner's accumulated history.

A normal day should contain:

- **1 core mental model**;
- **1 sound/listening focus**;
- **1 grammar/meaning focus**;
- **5–8 conversation-ready chunks/collocations** embedded in the lesson;
- **10–14 vocabulary/chunk records** in the vocab file (not all must be completely new; planned review must be labelled);
- **1 pragmatics/register insight**;
- **1 deeper English-language-system insight**;
- **3+ shadowing lines**;
- **1 spontaneous spoken-output task**;
- **5–8 diagnostic items + spoken rubric**.

Prefer fewer high-value ideas over crowded lessons.

### Gate 3 — Vocabulary filtering

For every candidate item, check:

- Was it already taught? If yes, mark it as review/expansion rather than pretending it is new.
- Is it common/useful enough for real communication?
- Does it have a natural reusable chunk/collocation?
- Does it add a useful pragmatic, pronunciation, listening, or discourse function?
- Is the Vietnamese gloss only a starting point, with actual usage explained?
- Does IPA/pronunciation guidance look internally consistent?
- Is register appropriate and clearly stated when relevant?

Reject items that are rare merely to look advanced, overly formal for the situation, redundant without pedagogical purpose, or hard to reuse.

### Gate 4 — Draft lesson as a progression

Draft in this learning order:

1. **Retrieve** one or two relevant prior ideas without showing answers first.
2. **Understand** today's mental model.
3. **Hear** the sound/rhythm/connected-speech feature.
4. **Notice** grammar as meaning/viewpoint.
5. **Use** natural chunks in realistic contexts.
6. **Understand deeper** via semantics/pragmatics/discourse/language-system insight.
7. **Speak** without a full script.
8. **Test** retrieval and transfer.

New material should connect explicitly to earlier material when useful.

### Gate 5 — Self-QA before publication

Perform a second pass after drafting. Reject/rewrite the daily package if any check fails.

#### Content QA

- Lesson topic matches the roadmap.
- No contradictory explanation versus previous lessons.
- No vocabulary item is accidentally presented as new when already taught.
- Examples sound natural for the intended register.
- Grammar explanation is not reduced to formula-only teaching.
- Pronunciation claims are cautious and do not imply one accent is the only correct English.
- Vietnamese explanations are clear and do not encourage word-for-word translation.
- Native-like does **not** mean stuffing the lesson with slang/idioms.

#### Progression QA

- There is at least one deliberate retrieval link to older material.
- Today's cognitive load is reasonable.
- New content advances the roadmap rather than restating yesterday.
- The learner must produce original speech, not only recognize answers.

#### Test QA

- Every test question is taught or inferable from the lesson.
- Questions test usage/meaning/listening/pragmatics, not trivia.
- Wrong options are plausible enough to diagnose a misconception but not deliberately misleading.
- Correct answer positions are not mechanically repeated.
- Explanations teach the reason, not merely reveal the option.
- Spoken challenge requires personalization and has a usable rubric.

#### Data QA

- Valid JSON.
- Day/date/topic agree across lesson, vocab, test, index, and ledger.
- Required fields exist.
- No path collision.
- Old daily files are untouched.

### Gate 6 — Update the content ledger

Update `assets/content-ledger.json` only after the daily package passes QA. Record:

- day/date/topic;
- core concepts introduced;
- vocabulary/chunks introduced;
- items intentionally reviewed;
- pronunciation focus;
- grammar focus;
- pragmatics/discourse focus;
- suggested future retrieval days.

The ledger is an audit/navigation aid. It never replaces immutable daily source files.

### Gate 7 — Publish atomically

Publish the new lesson, vocabulary, test, daily index update, and ledger update in **one atomic commit**.

Commit message format:

`learn(day-NNN): YYYY-MM-DD — <meaningful topic>`

Commit body/summary should mention the new focus and the older material intentionally reviewed.

Direct commit to `main` is preferred for this personal learning journal. A PR is optional only when a substantial structural/content-policy change needs a separate review trail.

### Gate 8 — Post-publish verification

After commit:

- Re-fetch `assets/daily-vocab.json` and confirm exactly one new day was appended.
- Verify the new lesson/vocab/test files are readable.
- Verify previous day's paths still resolve.
- Verify GitHub Pages deployment starts.
- If verification fails, fix with a clearly named correction commit; never silently rewrite history.

## Review cadence

Use spaced retrieval as a guideline, not a rigid algorithm:

- next day: quick reuse if foundational;
- ~3 days: contextual transfer;
- ~7 days: retrieval without prompts;
- ~14 days: contrast with related language;
- ~30 days: fluency reuse in a different situation.

The goal is not to "cover" English once. The goal is to make high-value English progressively easier to retrieve, hear, and use.
