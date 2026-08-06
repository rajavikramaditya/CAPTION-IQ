# CaptionIQ Workspace Guidelines & Agent Constitution

This document defines the development rules, competitor feature mappings, and prioritized backlog for the **CaptionIQ** project. All agent interactions and code additions must adhere to the principles outlined here.

---

## 1. Product Identity & Design Principle
* **Identity:** CaptionIQ is an AI Caption Intelligence Platform. It prioritizes *Language & Semantic Understanding* before applying styles.
* **Competitor Benchmark (Kalakar.io):** We must replicate **all features** of Kalakar.io (e.g., audio denoising, multi-language support, templates, SRT/Alpha exports, NLE plugins, batch processing).
* **Design Restriction:** **DO NOT COPY Kalakar's visual design.** Kalakar uses a dark, neon-heavy aesthetic. CaptionIQ must preserve its clean, premium, light-themed, modern UI.

---

## 2. Core Abstractions & Tech Stack
* **Source of Truth:** The **`CaptionDocument`** schema defined in `backend/models.py` is the single frozen contract for subtitle data. Any changes must preserve compatibility.
* **WYSIWYG Contract:** The frontend preview renderer (`CaptionRenderer.jsx`) and the future server-side burn-in renderer must consume the exact same `CaptionDocument` structure.
* **Backend:** FastAPI, Motor (Async MongoDB), PyJWT (Auth), Boto3/Requests (Storage abstraction).
* **Frontend:** React 19 (SPA), React Router v7, Axios, Tailwind CSS + Shadcn UI.

---

## 3. Current State of the Codebase
* **M-CORE (Core & Database):** Completed. Includes JWT/OAuth authentication, database models, and workspace setup.
* **M-INGEST (Media Ingest):** Completed. Chunked file streaming supporting HTTP 206 Range for player scrubbing.
* **M-STT & M-SEM (Transcription & NLP):** Completed. Whisper-1 audio transcription paired with GPT-5.4 Hinglish entity parsing (Persons, Locations, Actions).
* **M-TPL & M-PREV (Templates & Preview):** Completed. 11 client-side templates with size, position, and background box modifiers. Layout-stable renderer prevents character shifting.
* **M-EDIT (Caption Editor):** **In Progress.** Syncs active words and supports click-to-seek, but lacks user input controls for editing text/timestamps.

---

## 4. Prioritized Feature Backlog (Build Order)

To match Kalakar's features and improve CaptionIQ, we will implement tasks in this sequence:

### Priority 1: Interactive Transcript Editor (M-EDIT UI)
* **Goal:** Enable creators to correct transcription errors and sync timing manually.
* **Backend Integration:** Connect edited captions to `PUT /api/projects/{id}/caption` to save changes to the MongoDB `CaptionDocument`.
* **UI Features:**
  - Double-click or edit button on `SemanticWord` elements to rewrite text.
  - Controls to adjust start/end timestamps of individual words.
  - Buttons to split a segment into two or merge adjacent segments.

### Priority 2: Subtitle File Export Engine
* **Goal:** Replicate Kalakar's SRT and VTT subtitle file generation.
* **Implementation:** 
  - Add backend helper to convert a `CaptionDocument` into standard SRT/VTT/ASS formats.
  - Create a download button in the Studio UI to retrieve the subtitle file.

### Priority 3: Studio-Grade Audio Enhancement (M-AUD / Denoise)
* **Goal:** Clean up background noise from uploads before sending audio to Whisper.
* **Implementation:** 
  - Add an optional toggle "Clean Audio" on the video upload dashboard/dialog.
  - Implement a backend preprocessing step utilizing a denoising API (e.g., RNNoise or a third-party audio service) to clear noise.

### Priority 4: Alpha-Channel & Burn-In Rendering (M-RENDER)
* **Goal:** Export hardcoded captioned videos and transparent background overlays for NLEs.
* **Implementation:**
  - Setup an offline rendering server (using Remotion or `ffmpeg` + `libass`) to generate the finalized MP4.
  - Output an alpha-channel video track (transparent background) for pro editors to key into Premiere/Resolve.

---

## 5. Development & Coding Rules

1. **Keep UI State Synced:** Ensure all settings changed in the `TemplateBar` continue to persist securely in `localStorage` without race conditions on StrictMode double-mounting.
2. **Preserve Code Isolation:** Do not edit unrelated modules. Keep database integrations, authentication routing, and transcription engines modular.
3. **Local Testing Configuration:** 
   - Backend tests in [test_captioniq.py](file:///c:/Projects/CAPTION%20IQ/backend/tests/test_captioniq.py) target `/app` Docker directory paths (e.g. `/app/test_fixtures/speech.mp3`).
   - When running tests on a Windows host, ensure file paths are modified or environment overrides are injected to avoid `FileNotFound` failures.
4. **Hinglish Consistency:** Maintain the prompt rules in `transcription.py` that encourage Whisper to write names and places in Roman characters.
