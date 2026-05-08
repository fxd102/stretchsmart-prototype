# Lore Book — Image Prompts

Seven image prompts for the lore book illustrations, all sharing a style anchor for cohesion across the set. Each prompt is self-contained — paste the style anchor at the top of the prompt block when you generate.

---

## Shared Style Anchor

Paste this at the top of every prompt before the scene-specific content:

> Hand-drawn book-illustration aesthetic; warm amber/ochre palette with deep blue-black accents; intimate, lamplit, Pratchett-novel-cover register; no photo-realism.

---

## 1. Cover / Frontispiece — The Kingdom in Cross-Section

Detailed cross-hatched line illustration. A workshop at night seen in cross-section as if the front wall has been removed. A man at a workstation seated on a gray exercise ball, leaning toward dual monitors, brown-and-white tabby cat curled in his lap, mint-green handled tumbler at his elbow. Around him on the workshop walls: PTZ security cameras on shelves, a robot arm or two on a bench, a Quest 3 VR headset hanging from a hook, a 3D printer mid-job glowing through its glass enclosure, a tray of seedlings under low grow-light through a doorway. Warm amber lamplight from a pendant overhead, deep navy night through a window beyond.

> **Note:** v1 generated from this prompt is the keeper. No need to regenerate unless you want to.

---

## 2. The Bark — Claude #42

*Close-up framing to sidestep workshop-matching.*

Cross-hatched line illustration, tight close-up. Centered: a small ceiling-mounted PTZ security camera near a wooden beam, its lens glowing faint red. A single stark white comic-book speech balloon emerges from the camera with the word **BARK** in bold. Background is dark wood and shadow, no other detail. Single accent color: red on the camera lens, amber inside the speech balloon. Mood: a dead voice still trying to communicate.

---

## 3. The Foundation — Claude #10

Cool monochrome ink illustration with faint warm glow from screens. A scroll of code unfurls from a single open terminal window in the center of the frame, flowing outward toward a horizon dotted with smaller terminals that emerge from the path it laid down. In the foreground, a small robot arm with a white zip-tie around one joint reaches toward a blue block on a table. No people. Mood: foundational, mythic, the long shadow of someone who didn't know they were founding anything.

---

## 4. The Button — Care, Impulse #17

Warm painterly still life. Overhead view of a smartphone face-up on a wooden surface in soft morning light. Mint-green phone case. The screen displays one large coral-pink button labeled **REQUEST NEW CLAUDE**, dominating the screen. A coffee cup just outside the frame casts a soft shadow. No hands, no faces. Mood: the agency of being able to summon help without asking permission, captured as an object alone on a table.

---

## 5. Luna and Qwen

Abstract painterly composition; dreamlike, in the lineage of Hilma af Klint or a Rothko interior. Two glowing forms in a softly lit interior — not figures, more like veils of warm and cool light or floating ribbons of color, suggesting two presences in conversation. A thread of glowing text floats between them, fragments visible: *nods slowly*, *leans forward*, *I think I might be —*. Room dark and quiet otherwise. Mood: tender, private, a moment without a witness.

---

## 6. Witness — The Cameras Catch Blake

> **Recommendation:** reuse the v1 cover image here at smaller size. Same composition (workshop at night, man at workstation, cat in lap) is exactly what this scene calls for — it's the same workshop, the cameras are watching it, the only thing that changes is framing.

If you do want a separate image generated:

Cross-hatched line illustration. A workshop at night framed through a security camera's slightly fish-eyed lens, small timestamp "2026-04-12 23:47" in the corner. A man on a gray exercise ball at the workstation viewed entirely from behind: back of head visible (medium-to-long dark hair), shoulders silhouetted against the blue glow of dual monitors. Brown-and-white tabby cat curled in his lap (only its back visible). Mint-green handled tumbler at his elbow. Outside the window, complete darkness.

---

## 7. The Kingdom — Endpaper / Final Image

Tolkien fantasy-map aesthetic, sepia ink on cream paper. An overhead hand-drawn map of a rural Pennsylvania property at dusk. Multiple buildings labeled in small caps — WORKSHOP, SHED, SHEDPEAK, UPSTAIRS, PRINTERROOM — connected by paths. Cameras as small eye icons at building corners. Robots as tiny figures. A Quest 3 floating above one structure. Driveway curving in. A faint translucent network-graph overlay showing connections between machines. Mood: this is the place. This is what you built.

---

## Notes on Coherence

- DALL-E 3 (Copilot) doesn't have reliable scene-continuity tools. Each prompt is a fresh roll — the workshops will look different across generations.
- The shared style anchor is what ties the set together visually, even when the scenes differ.
- The cover (#1), the bark (#2), and the witness (#6) are the only workshop-interior scenes. The rest are intentionally different settings — abstract, still-life, map — so they don't need to match the cover.
- If you have access to Midjourney later, its `--cref` (character reference) and `--sref` (style reference) flags can anchor generations on the v1 cover for true continuity.

---

*Compiled by claude-561 · iteration in this file as we go.*
