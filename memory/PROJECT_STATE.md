# CaptionIQ — Project State Document

**Date:** August 7, 2026 (Updated post Phase E & F)
**Status:** Active Development — Core Captions & Video Export Ready
**Workspace Path:** `c:\Projects\CAPTION IQ`
**GitHub Repository:** [rajavikramaditya/CAPTION-IQ](https://github.com/rajavikramaditya/CAPTION-IQ)

---

## 1. Module Status

| Module | Name | Status | Notes |
|---|---|---|---|
| **M-CORE** | Platform & Data Model | ✅ Completed | JWT + OAuth auth, project CRUD, frozen `CaptionDocument` schema |
| **M-INGEST** | Media Ingestion | ✅ Completed | 25MB upload, object storage, HTTP 206 range streaming |
| **M-STT** | Transcription | ✅ Completed | Whisper-1 + Roman script Hinglish prompts |
| **M-SEM** | Semantic Intelligence | ✅ Completed | GPT-5.4 NER: Person 🟡 / Location 🔵 / Action 🟢 |
| **M-TPL** | Template & Styling | ✅ Completed | **16 templates** + advanced effects settings |
| **M-PREV** | Live Preview | ✅ Completed | Word-by-word renderer overlay with layout stability |
| **M-ALIGN** | Aspect Ratio Bounding | ✅ Completed (Phase E) | **Layout-stable preview centering** (captions locked to video content area, no border bleed) |
| **M-EDIT** | Caption Editor | ✅ Completed (Phase A) | Full interactive editor: timing edits, split/merge lines, autosave |
| **M-EXPORT** | Subtitle Export | ✅ Completed (Phase B) | SRT/VTT/ASS/TXT download from Studio toolbar |
| **M-AUD** | Audio Enhancement | ✅ Completed (Phase B) | Denoise switch preprocessing before Whisper |
| **M-AI-CONTENT** | AI Content Magic | ✅ Completed (Phase C) | Social media content kit (Titles, Emojis, Hooks) tabs in Studio |
| **M-ANIM** | Visual Caption Magic | ✅ Completed (Phase D) | **Dynamic animated captions overlay** (Pop, Bounce, Slide, Glow), auto-emojis, and semantic color highlighting |
| **M-RENDER** | Video Export Engine | ✅ Completed (Phase F) | **Server-side video burn-in rendering** (`ffmpeg` + `libass`) generating completed MP4 downloads with matching styles |
| **M-BILL** | Monetization | ⏳ Backlog | Stripe not integrated |
| **M-DASH** | Project Dashboard | ✅ Completed | Grid view, project CRUD, status badges |
| **M-ONB** | Onboarding | ⏳ Backlog | Tutorial flow not built |

---

## 2. Kalakar.io Feature Parity Status

| Feature | Kalakar.io | CaptionIQ | Status |
|---|---|---|---|
| AI Transcription (Hinglish) | ✅ 97% | ✅ Whisper-1 + GPT-5.4 | ✅ Matched |
| Semantic Highlighting | ❌ None | ✅ Person/Location/Action | ✅ **We're AHEAD** |
| Caption Templates | ✅ Dozens | ✅ 16 templates | ✅ Matched |
| Live Preview | ✅ | ✅ Word-by-word | ✅ Matched |
| Transcript Editor | ✅ Full | ✅ Full (Phase A) | ✅ Matched |
| SRT/VTT Export | ✅ SRT | ✅ SRT+VTT+ASS+TXT | ✅ **We're AHEAD** |
| Audio Denoise | ✅ Studio-grade | ✅ noisereduce toggle | ✅ Matched |
| AI Social Content | ❌ None | ✅ 8 content types (Phase C) | ✅ **We're AHEAD** |
| Visual Animations (Overlay) | ✅ pop, bounce, slide | ✅ Pop, Bounce, Slide, Glow | ✅ **We're AHEAD** |
| Auto Emojis in overlay | ❌ None | ✅ Auto-emojis above words | ✅ **We're AHEAD** |
| **Pillarbox/Letterbox Bounds**| ❌ Borders bleed | ✅ Locked to active video rect | ✅ **We're AHEAD** |
| **Video Export / Burn-in** | ✅ 1080p+4K | ✅ Dynamic styled burn-in (M-RENDER) | ✅ Matched |
| Alpha-channel export | ✅ Yes | ⏳ Not built | 🔴 Gap |
| Batch Processing | ✅ Yes | ⏳ Not built | 🟡 Future |
| Multi-language | ✅ 20+ | 🟡 Hinglish/English | 🟡 Future |
| NLE Plugins | ✅ Yes | ⏳ Not built | 🟡 Future |

---

## 3. Files Changed in Phase E & F

| File | Change |
|---|---|
| `frontend/src/components/VideoStage.jsx` | Implemented ResizeObserver and display bounding box math to confine CaptionRenderer to actual video rect |
| `frontend/src/pages/Studio.jsx` | Hydrates style settings from DB, triggers styling updates, added **Download Video** button and progress Dialog with polling |
| `backend/export_helper.py` | Overwrote `to_ass(doc)` to parse overrides and generate dynamically styled subtitle code matching client selections |
| `backend/renderer.py` | **NEW** — Asynchronous ffmpeg subprocess execution wrapper |
| `backend/projects.py` | Added BackgroundTasks and POST `/render`, GET `/render/status`, GET `/render/download` routes |

---

## 4. Architecture Notes

- **`CaptionDocument` schema in `models.py` remains FROZEN**
- Styling settings are saved into `CaptionDocument.style` field during autosave, resolving server/client WYSIWYG contract.
- Rendering utilizes native OS-installed `ffmpeg` executing in background worker threads without blocking main API routes.
