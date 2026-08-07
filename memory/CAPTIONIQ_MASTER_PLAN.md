# CaptionIQ — Production Implementation Master Plan
_Lead Architect roadmap. Living document. Source of truth lives in Git, not in chat._

## 0. Competitive read (Kalakar.io) — WHY each feature exists
| Kalakar feature | Why it exists (job-to-be-done) | Our smarter version |
|---|---|---|
| Multi-language Desi transcription, word timing | Editors waste most time on manual subtitling | Same, + Hinglish code-switch handling + confidence-scored words the editor can fix fast |
| Animated word-by-word templates (Hormozi/Beast) | Retention captions drive Reels/Shorts views | Template engine driven by ONE caption-document schema; add semantic-aware auto-emphasis (names/CTAs pop automatically) |
| Server render (burn-in) 1080p/4K | Creators need final video, not just SRT | Async render workers with strict preview↔render parity (the WYSIWYG contract) |
| SRT / Alpha / green-blue exports, batch | Pro editors bring captions into their NLE | Same exports + NLE-friendly ASS; batch as a queue |
| Audio enhancement | Field audio is noisy | Ship via 3rd-party API first, don't build DSP in-house |
| Templates savable as presets | Brand consistency across a channel | Presets + "Brand Kit" (fonts, colors, safe-zones) |
| Credit-metered tiers | Transcription + render are the real COGS | Meter the same two levers; usage dashboard so creators trust it |
| NLE plugins | Reach pro editors where they already work | Later milestone; native plugin work belongs OUTSIDE Emergent |
| Team spaces | Agencies manage many channels | Late milestone; needs solid auth + project model first |

**Guiding principle:** never clone the render/style math; redesign around a single **Caption Document** that both the browser preview and the server renderer consume. This one decision prevents the #1 failure mode (preview ≠ final export) and saves the most credits long-term.

---

## 1. Major modules
| # | Module | What it owns |
|---|---|---|
| M-CORE | Platform & Data Model | Auth, users, projects, **Caption Document schema**, storage abstraction, API gateway, job/usage tables |
| M-INGEST | Media Ingestion | Upload, object storage, transcode to standard container, audio extraction, duration/limits |
| M-STT | Transcription Engine | Whisper/Deepgram, multi-language, word timestamps, language detect, retries |
| M-SEM | Semantic Intelligence (**our moat**) | Entity tagging (person/location/action), auto-emphasis, keyword/CTA detection |
| M-TPL | Template & Styling Engine | Animated presets, fonts (Indic + custom), colors, safe-zones, preset save/load |
| M-PREV | Live Preview Renderer | Browser WYSIWYG render of the Caption Document, synced to video time |
| M-EDIT | Caption Editor | Edit words, fix timing, split/merge lines, apply styles/entities |
| M-RENDER | Render & Export Pipeline (**highest risk**) | Server burn-in (1080p/4K), SRT/VTT/ASS/Alpha, batch queue |
| M-BILL | Monetization | Stripe subscriptions, credit metering, usage limits, add-ons |
| M-DASH | Project Management | Dashboard, folders, batch upload/render, search |
| M-ONB | Onboarding & Retention | Guided first project, template gallery, empty states, re-engagement |
| M-TRANS | Translation | Desi→English (+reverse) built on transcript |
| M-AUD | Audio Enhancement | Noise removal via 3rd-party API |
| M-TEAM | Collaboration | Shared spaces, roles, seats |
| M-OPS | Observability & Ops | Job queue, logging, error tracking, cost/usage monitoring |
| M-NLE | NLE Plugins | Premiere/DaVinci extensions (native, external build) |

---

## 2. Dependencies (who needs whom)
```
M-CORE ──► everything
M-INGEST ─► M-STT
M-STT ────► M-SEM, M-TRANS, M-EDIT
M-TPL ────► M-PREV, M-RENDER
M-PREV ───► M-RENDER        (parity: same Caption Document)
M-EDIT ───► M-RENDER
M-BILL ───► gates M-STT, M-RENDER, M-TRANS, M-AUD (usage)
M-OPS ────► supports M-STT, M-RENDER (async jobs)
M-DASH, M-ONB ─► need M-CORE + at least one working create→export loop
```

## 3. Correct build order (credit-optimal)
1. **M-CORE** (schema first — cheapest thing with highest leverage)
2. **M-INGEST**
3. **M-STT**
4. **M-SEM** _(differentiator early → validate the wedge)_
5. **M-TPL + M-PREV** _(build together; preview is the contract)_
6. **M-EDIT**
7. **M-RENDER** _(only after preview is locked)_
8. **M-BILL**
9. **M-DASH + M-ONB**
10. **M-TRANS, M-AUD** (additive)
11. **M-TEAM**, then **M-NLE**
`M-OPS` is woven in from step 3 onward (job queue arrives with STT).

## 4. Modules that can be developed independently (parallel-safe)
Once **M-CORE schema is frozen**, these have no cross-deps and can run in separate chats/branches:
- M-SEM (consumes transcript JSON — can mock transcript)
- M-TPL (pure styling against schema)
- M-TRANS, M-AUD (isolated 3rd-party wrappers)
- M-DASH shell / M-ONB copy & empty states
- M-OPS scaffolding

## 5. Hard prerequisites (must finish before others start)
- **Caption Document schema (M-CORE)** must be frozen before M-SEM/M-TPL/M-PREV/M-EDIT/M-RENDER — this is the #1 gate.
- **M-PREV must be locked before M-RENDER** (parity contract).
- **M-BILL usage tables** should exist before public launch (meter STT + render).
- **M-INGEST standardized media format** before M-STT and M-RENDER (avoid codec surprises).

---

## 6. Milestones: MVP → Production
| Milestone | Goal (demoable outcome) | Modules | Exit criteria |
|---|---|---|---|
| **v0 (done)** | Upload → Whisper → semantic-highlighted live preview | current app | shipped ✅ |
| **v1 Foundation** | Accounts + saved projects, frozen schema | M-CORE, M-INGEST | user can create/save/reopen a project; schema documented |
| **v2 Understand** | Multi-language STT + semantic layer productionized | M-STT, M-SEM, M-OPS(jobs) | Hinglish + 3 languages, word timing, entities, async job status |
| **v3 Style** | Template engine + true WYSIWYG preview | M-TPL, M-PREV | 3–5 animated templates, brand kit, preview matches spec |
| **v4 Edit** | Full caption editor | M-EDIT | fix words/timing/styles, split/merge, undo |
| **v5 Export** | Render burn-in + SRT/ASS/Alpha | M-RENDER | 1080p render == preview within parity tolerance; SRT valid |
| **v6 Monetize** | Subscriptions + metering | M-BILL, M-DASH, M-ONB | Stripe tiers live, usage limits enforced, onboarding flow |
| **v7 Scale** | Translation, audio enhance, batch, 4K | M-TRANS, M-AUD, batch | add-ons metered, batch queue stable |
| **v8 Expand** | Teams, then NLE plugins | M-TEAM, M-NLE | seats/roles; plugin exports Alpha/SRT |

---

## 7. High-risk technical areas (rank-ordered)
1. **Render pipeline (M-RENDER)** — WYSIWYG parity, cost, long jobs, GPU. Emergent's container is not a render farm (2-min command cap, no heavy GPU). **Must be an async worker on dedicated infra.** Mitigation: define parity as a golden test; render engine = Remotion or ffmpeg+libass; keep the Caption Document the single source.
2. **Preview↔Render parity** — divergence destroys trust. Mitigation: shared schema + frame-diff tests preview vs first rendered frame.
3. **Word-timestamp accuracy for Hinglish/code-switching** — models drift on mixed scripts. Mitigation: confidence scores + fast editor correction; per-language prompt tuning.
4. **Indic + custom font rendering** in BOTH browser and server (shaping, ligatures). Mitigation: pin the exact same font files/shaper on both sides.
5. **Cost control** — STT + render are COGS; runaway usage kills margins. Mitigation: meter from day one (M-BILL usage tables land early even if billing UI is later).
6. **Async job architecture at scale** — queue, retries, idempotency, status. Mitigation: M-OPS job model introduced with M-STT, reused by M-RENDER.

## 8. Complexity estimates (relative effort + risk)
| Module | Size | Risk | Notes |
|---|---|---|---|
| M-CORE | M | Med | schema design is the expensive thinking, not the code |
| M-INGEST | M | Med | transcode/codec edge cases |
| M-STT | M | Med | integration-heavy, mostly wiring + retries |
| M-SEM | S–M | Low | LLM prompt + mapping; already prototyped in v0 |
| M-TPL | L | Med | animation model + font handling |
| M-PREV | M | Med | must mirror render exactly |
| M-EDIT | L | Med | lots of UX state, undo/redo |
| M-RENDER | XL | **High** | the whole ballgame; dedicated infra |
| M-BILL | M | Med | Stripe + metering logic |
| M-DASH | M | Low | CRUD + lists |
| M-ONB | S | Low | copy + flows |
| M-TRANS | S | Low | API wrapper |
| M-AUD | S | Low | API wrapper |
| M-TEAM | L | Med | roles/seats/permissions |
| M-OPS | M | Med | queue + monitoring |
| M-NLE | L | **High** | native plugin, external toolchain |

---

## 9. Git workflow per milestone
- **Trunk-based, short-lived branches.** `main` protected; branch `feat/<milestone>-<module>` (e.g. `feat/v3-templates`).
- **One Emergent chat ≈ one milestone.** Keeps context tight and credits low.
- **Checkpoint discipline:** push to GitHub after each module passes tests; **tag `v1`, `v2`… at milestone exit.** Tags are your rollback points.
- **Schema changes = their own PR** with migration notes (M-CORE is sacred; review carefully).
- **Cursor work** flows back via normal PRs into the same branches; when returning to Emergent, tell it "pull latest, here's what changed in X" — Emergent does not auto-detect external Git changes.

## 10. Testing strategy per milestone
- **Every milestone:** run the Emergent testing agent on new backend endpoints + frontend flows before merge; fix all reported issues.
- **M-STT:** golden audio fixtures with known transcripts (Hinglish + 2 languages); assert word count/timing tolerance.
- **M-SEM:** fixture transcripts → assert entity classes populate; guard against over-tagging.
- **M-TPL/M-PREV:** visual snapshot tests of preview per template.
- **M-RENDER:** (1) SRT/ASS golden-file tests; (2) **parity test** — frame-diff first rendered frame vs preview screenshot within tolerance; (3) render smoke test per resolution.
- **M-BILL:** Stripe test-mode flows (subscribe, limit hit, add-on); metering unit tests.
- **Regression gate:** before each milestone tag, re-run prior milestone's critical flows.

## 11. Build in Emergent vs refine in Cursor
**Build in Emergent (fast full-stack + testing agent):**
- M-CORE APIs & schema, M-INGEST, M-STT wiring, M-SEM, M-TPL & M-PREV UI, M-EDIT UI, M-BILL (Stripe), M-DASH, M-ONB, M-TRANS/M-AUD wrappers. Anything that is app scaffolding + integrations + UI wiring.

**Refine/own in Cursor + dedicated infra (things Emergent's container isn't built for):**
- **M-RENDER worker** (ffmpeg/Remotion, GPU tuning, long-running jobs, parity math).
- Performance/load optimization, queue tuning, DevOps/deploy, cost dashboards.
- **M-NLE native plugins** (Premiere/DaVinci) — cannot be built in Emergent at all.
- Heavy font-shaping / animation-math edge cases.

---

## 12. Credit-efficiency rules for this project
1. **Freeze the Caption Document schema before anything consumes it.** Rework here is the most expensive mistake.
2. **One milestone per chat**, focused prompts, one feature at a time — never "build the whole editor + render + billing" in one go.
3. **Push to GitHub after every green milestone**; treat tags as rollback so you never regenerate working code.
4. **Preview and render share one schema** → build parity once, not twice.
5. **Meter usage early** so scaling doesn't require re-architecting.
6. **Guardrail every prompt:** "Do not change existing UI or working functionality unless explicitly requested."
7. Keep this file (and PRD.md) in `/docs` in GitHub; at the start of any new chat, tell Emergent to read them instead of re-explaining.

## 13. Immediate next step (no code yet)
Design & freeze the **Caption Document schema** (words[], timing, styles, entity tags, animation config, brand kit refs) + the Project/User data model. Everything downstream keys off this. That is milestone **v1** kickoff.
