# CaptionIQ — Product Requirements Document

## Original Problem Statement
Build the first MVP of CaptionIQ, an AI caption studio for Indian creators: upload a video, auto-generate captions via AI transcription (Whisper), live caption preview, and the core innovation — Semantic Highlighting (person=yellow, location=blue, action=green). Hinglish (Roman Hindi) focus. Later evolved into a full professional editor matching Kalakar.io-level feature parity.

---

## User Personas
- **Primary**: Indian content creators (YouTube, Reels, Shorts) making Hinglish/Hindi content
- **Secondary**: English-language creators wanting professional word-by-word caption styling

---

## User Choices
- Transcription: Real OpenAI Whisper (whisper-1) via Emergent Universal Key
- Video: stored in Emergent object storage (local fallback if unavailable)
- Entity tagging: gpt-5.4 with rule-based fallback
- UI theme: light & clean, CaptionIQ orange (#FA5D29) accent
- Auth: JWT email/password + Emergent-managed Google OAuth

---

## Architecture
### Backend (FastAPI + Motor + MongoDB)
- `server.py` — app entrypoint, router mounts
- `auth.py` — JWT register/login/me/refresh/forgot-reset, brute-force lockout, Google OAuth session exchange
- `projects.py` — CRUD projects, `POST /transcribe`, `PUT /caption`, `POST /translate`, `POST /script`, `GET /export`, `POST /render`
- `transcription.py` — Whisper (emergentintegrations) + gpt-5.4 entity tagging + rule-based fallback. NO hardcoded demo data.
- `export_helper.py` — SRT/VTT/ASS/TXT/CSV/JSON generators using `_build_chunks()` to match frontend display
- `models.py` — CaptionDocument, CaptionWord, CaptionSegment, Project, User Pydantic models
- `storage.py` — Emergent object storage with local fallback
- `diarization.py` — Speaker assignment (assign_speakers)
- `render.py` — Video burn-in rendering (ffmpeg)

### Frontend (React + Tailwind + Shadcn/UI)
- `pages/Studio.jsx` — Main editor: layout state, RAF timing, undo/redo history, word CRUD, chunk/line derivation, export
- `components/VideoStage.jsx` — Video preview with 60fps RAF timing, overlay rect tracking, portrait/landscape containers
- `components/CaptionRenderer.jsx` — Professional multi-line caption renderer (up to 2 balanced lines, semantic highlights, word animations, chunk entrance)
- `components/CaptionEditor.jsx` — Transcript panel with SemanticWord-based word editor
- `components/SemanticWord.jsx` — Single word: semantic badge, active state, double-click → WordEditPopover
- `components/WordEditPopover.jsx` — Inline edit: text, start/end timing, entity tag, split, delete
- `components/TimelineBar.jsx` — Segment track + word micro-track with drag handles
- `components/TemplateBar.jsx` — Template switcher + position/size/uppercase/box/animation controls
- `lib/templates.js` — 16 professional templates: Minimal, Modern, Podcast, News, Finance, Cinematic, Shorts, Gaming, Education, Bold Impact, Hype, Mr Beast, Hormozi, Ali Abdaal, Motivation, Luxury
- `hooks/useCaptionHistory.js` — Undo/redo stack
- `hooks/useKeyboardShortcuts.js` — Ctrl+Z/Ctrl+Shift+Z/Ctrl+F shortcuts

---

## What's Been Implemented

### v0 — Studio MVP (2026-06)
- Real Whisper transcription + AI entity tagging (verified end-to-end)
- Live caption preview overlay synced to video time
- Semantic Highlighting in transcript + overlay
- "Try demo" sample Hinglish flow

### v1 — Foundation (2026-07)
- Backend refactored into modules: models, database, storage, auth, transcription, projects, server
- Frozen CaptionDocument schema (words/segments/style/word_count/duration) — source of truth
- JWT auth (register/login/me/logout/refresh/forgot/reset, bcrypt, brute-force lockout)
- Emergent Google OAuth integration
- Projects: create/list/get/delete with ownership isolation; caption persistence
- Media ingestion: upload to Emergent object storage, streaming with HTTP Range (206)
- Frontend: AuthContext, Login/Signup, Google login, ProtectedRoute, Dashboard
- Verified: testing agent 100% (iteration_5)

### v3 — Caption Template & Rendering Engine (2026-07)
- Professional word-by-word CaptionRenderer with multi-line balancing
- 11 → 16 templates (Minimal, Modern, Podcast, News, Finance, Cinematic, Shorts, Gaming, Education, Bold Impact, Hype, Mr Beast, Hormozi, Ali Abdaal, Motivation, Luxury)
- TemplateBar: instant template switch + position/size/uppercase/box/animation controls
- Overlay uses short ~4-7 word display chunks (buildChunks) independent of Whisper segments
- Style persisted per project in localStorage + MongoDB

### v4 — Studio Professional Overhaul (2026-08)
- **CRITICAL BUG FIX**: Removed hardcoded "Modi visited Mumbai..." fallback from `transcription.py`. Backend now raises RuntimeError properly when Whisper fails.
- **API KEY FIX**: Updated EMERGENT_LLM_KEY in `backend/.env` to real key (`sk-emergent-5034c46676d552e91F`)
- Manual Portrait (9:16) / Landscape (16:9) preview mode toggle — persisted per project
- 60fps `requestAnimationFrame` timing sync in `VideoStage.jsx` for smooth word highlighting
- `docToResult` now includes `speaker_id` and `confidence` for diarization display
- Fixed `TimelineBar` word keys: `w.word_id` → `w.id` (correct property name)
- Fixed `CaptionRenderer` chunkKey: `w.word_id` → `w.id`
- `export_helper.py` uses `_build_chunks()` to produce SRT/VTT timing that matches UI display
- Word-level editing: double-click any word → popover for text, timing, entity tag, split, delete
- Segment merge: hover segment → "Merge ↓" button
- Timeline drag handles for adjusting segment start/end times
- Undo/redo history with keyboard shortcuts (Ctrl+Z / Ctrl+Shift+Z)
- Search & Replace panel (Ctrl+F)
- Language selector (14 languages) + Translate + Script switch (Roman ↔ Devanagari)
- Remove Fillers, Spellcheck & Fix toolbar buttons
- Custom vocabulary input for Whisper accuracy boost
- Video burn-in render with progress polling and codec selection (H.264/H.265)
- Export formats: SRT, VTT, ASS, JSON, CSV, TXT, Alpha MOV
- Safe Area toggle overlay
- Onboarding tour, Font uploader

---

## Key API Endpoints
- `POST /api/auth/register` — create account
- `POST /api/auth/login` — login (returns JWT)
- `GET /api/projects` — list projects
- `POST /api/projects` — create project
- `POST /api/projects/{id}/transcribe` — Whisper transcription
- `PUT /api/projects/{id}/caption` — save caption doc edits
- `GET /api/projects/{id}/export?format=srt|vtt|ass|json|csv|txt` — export subtitles
- `POST /api/projects/{id}/render` — video burn-in render
- `GET /api/projects/{id}/render/status/{job_id}` — poll render progress
- `POST /api/projects/{id}/translate` — translate captions
- `POST /api/projects/{id}/script` — roman↔devanagari switch

---

## Backlog (P0 → P2)

### P1 — Upcoming
- End-to-end Studio creator workflow testing (word edit, split, merge, export)
- Caption position controls: drag-to-reposition within the video overlay

### P2 — Future
- Custom stroke, shadow, background style overrides beyond the 16 presets
- Multi-language STT + productionized semantic layer + async job queue
- Audio extraction (ffmpeg) to support >25MB clips
- Devanagari/Roman toggle live in preview

---

## Environment
- Backend: FastAPI on 0.0.0.0:8001, MongoDB via MONGO_URL
- Frontend: React on port 3000, `REACT_APP_BACKEND_URL` for API calls
- Key: `EMERGENT_LLM_KEY` in `backend/.env` (real key, not dummy)
