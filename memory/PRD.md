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
- Real Whisper transcription + AI entity tagging (verified end-to-end)
- Live caption preview overlay synced to video time
- Semantic Highlighting (yellow/blue/green) in transcript + overlay
- Active-word tracking, click-line-to-seek, auto-scroll
- "Try demo" sample Hinglish flow
- Light/clean UI per design guidelines; all interactive elements have data-testid

## Backlog
- P1: Word-level nudging/editing of captions
- P1: Persist projects (needs storage + DB)
- P2: SRT/VTT export
- P2: Custom entity categories / color themes
- P2: Multi-language toggle (Devanagari vs Roman)

## Next Tasks
- Gather user feedback on transcription accuracy for real Hinglish clips
