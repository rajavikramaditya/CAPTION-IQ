# CaptionIQ — Product Requirements Doc

## Original Problem Statement
Build the first MVP of CaptionIQ, an AI caption studio for Indian creators: upload a video, auto-generate captions via AI transcription, live caption preview, and the core innovation — Semantic Highlighting (person=yellow, location=blue, action/verb=green). Hinglish (Roman Hindi) focus. MVP only — no auth, payments, SEO, export, timeline editing, analytics, or advanced AI styling.

## User Choices
- Transcription: Real OpenAI Whisper (whisper-1) via Emergent Universal Key
- Video: in-browser preview only (no storage)
- Entity tagging: AI-powered (gpt-5.4)
- UI theme: light & clean

## Architecture
- Backend: FastAPI. `POST /api/transcribe` (multipart `file`) -> OpenAISpeechToText whisper-1 (verbose_json, word+segment timestamps) -> LlmChat gpt-5.4 tags persons/locations/actions -> returns `{text, words[{text,start,end,entity_type}], segments}`. Files handled in a temp file and deleted (not persisted). 25MB guard -> 413.
- Frontend: React single-page Studio. `Studio.jsx` orchestrates state; `VideoUploader`, `VideoStage` (video + live caption overlay), `CaptionEditor` (legend + transcript + generate button), `SemanticWord`, `Header`. `buildLines` groups words by segments; active word/line derived from video `currentTime`. Sample Hinglish demo in `lib/mockData.js`.
- Integrations: emergentintegrations, EMERGENT_LLM_KEY in backend/.env.

## Implemented (2026-06)
### v0 — Studio MVP
- Real Whisper transcription + AI entity tagging (verified end-to-end)
- Live caption preview overlay synced to video time
- Semantic Highlighting (yellow/blue/green) in transcript + overlay
- Active-word tracking, click-line-to-seek, auto-scroll
- "Try demo" sample Hinglish flow
- Light/clean UI per design guidelines; all interactive elements have data-testid

### v1 — Foundation (M-CORE + M-INGEST) ✅
- Backend refactored into modules: models, database, storage, auth, transcription, projects, server
- **Frozen Caption Document schema** (words/segments/style/word_count/duration) — source of truth for preview + future render
- Auth: JWT email/password (register/login/me/logout/refresh/forgot/reset, bcrypt, brute-force lockout keyed on X-Forwarded-For) + Emergent Google OAuth (session exchange); unified resolver accepts cookie or Bearer
- Projects: create/list/get/delete with ownership isolation; caption persistence (transcribe writes caption_document; PUT /caption saves edits)
- Media ingestion: upload to Emergent object storage, DB-backed media records, streaming endpoint with HTTP Range (206)
- jobs + usage_events collections (M-OPS/M-BILL groundwork; transcription creates a job + usage event)
- Frontend: AuthContext, Login/Signup, Google login, ProtectedRoute, Dashboard (projects grid + new-project upload), Studio refactored to project-backed (reuses existing VideoStage/CaptionEditor unchanged)
- Verified: testing agent frontend journey 100%; backend 13/13 after brute-force lockout fix

### v3 — Caption Template & Rendering Engine (frontend-only) ✅
- Professional word-by-word `CaptionRenderer` (replaces old simple overlay), memoized, layout-stable, CSS-transition active word
- 11 templates (`lib/templates.js`): Minimal, Modern, Podcast, News, Finance, Cinematic, Shorts, Gaming, Education, Bold Impact, Hype — each with font/weight/stroke/shadow/box/rounded/word+line spacing/uppercase/position/safe-margin + active {scale,color,bg}
- `TemplateBar`: instant template switch + position/size/uppercase/box controls (no re-transcription; transcript unchanged)
- Overlay uses short ~4-word display chunks (`buildChunks`) independent of Whisper segments, so captions never cover the video
- Style persisted per project in localStorage (lazy useState init, StrictMode-safe)
- No backend/API/auth/storage changes
- Verified: testing agent 100% (iteration_4) — fixed reported bugs (whole-transcript overlay; template visuals) + persistence race

## Backlog
- v2: Multi-language STT + productionized semantic layer + async job status
- P2: SRT/VTT export, custom entity categories, Devanagari/Roman toggle
- Cursor/infra: audio extraction (ffmpeg) to support >25MB clips; range streaming from storage without loading full bytes

## Next Tasks
- Gather user feedback on transcription accuracy for real Hinglish clips
