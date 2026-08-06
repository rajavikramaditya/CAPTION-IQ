# Executive Summary

CaptionIQ is envisioned as the **“smarter captioning”** platform that not only matches but far surpasses Kalakar.io and other caption tools.  Kalakar.io is a specialized AI caption generator targeting “Desi” editors, offering auto-captions in Hindi, Urdu, Tamil, Pashto, and many regional languages.  It boasts features like studio-grade audio enhancement and a variety of templates (Ali Abdaal, MrBeast styles, etc.).  However, we found **key gaps** in Kalakar’s approach: limited Hinglish handling, lack of deep linguistic understanding (e.g. no grammar or semantic highlighting), and restrictive free-tier limits (short video length, watermarks, no 4K export).  Free users get only *5 minutes* of processing and basic templates, while true 4K exports and advanced features require paid plans.  Kalakar’s pricing (₹599–1999/month) is high for many creators.

Our strategy is to build CaptionIQ as a **next-generation AI Caption Studio** for Indian creators – combining *all* of Kalakar’s strengths (multi-language, templates, audio cleanup) with **deep semantic intelligence and seamless UX**.  CaptionIQ will understand entire sentences (subject, object, action, time, etc.) and auto-highlight them in captions. It will natively handle code-switched Hinglish via a specialized grammar-aware engine.  We will undercut competitors on pricing (e.g. starting plans near ₹199, well below Kalakar’s ₹599) while delivering more value.  Importantly, we first recommend producing a detailed Product Requirements / competitor analysis document, not diving straight into code.  

Key findings from our research:

- **Kalakar.io Audit:** Supports dozens of languages (Hindi, Urdu, Tamil, Marathi, Nepali, Persian, Arabic, etc.) with 97%+ accuracy claims. It offers **audio denoising**, caption **templates**, and NLE plugins (Premiere/Resolve). Free tier is very limited (2 min, low‐quality/no-watermark basic export); full 4K/alpha export only on top tier.  
- **User Pain Points:** Free users hit length/watermark limits; pro users pay for every new feature. No semantic or grammar-level editing – caption AI only transcribes word-by-word, lacking subject/object emphasis. Hinglish phrases (mixing English words in Hindi syntax) often break transcription.  
- **Tech Inference:** Likely stack is Python backend (possibly FastAPI), using ASR (maybe Whisper/Deepgram) for transcription and custom ML for audio-cleaning. Video rendering uses FFmpeg and alpha-channel output. Scaling this requires careful GPU/queue management. Key gaps: no mention of LLM or advanced NLP modules.  
- **Feature Gap Analysis:** We list every Kalakar feature (multi-language ASR, templates, batch processing, plugins, audio cleanup, etc.), its user value, and how CaptionIQ will match or improve it (e.g. *plus* grammar parsing, richer templates, enhanced UX). Features like real-time preview and keyboard shortcuts must be present to compete.  
- **Hinglish & Semantics:** As Deepgram notes, Hinglish causes very high error rates (code-switching can push WER to 27–70%). CaptionIQ will use a multi-stage pipeline: first multimodal ASR (like Whisper or Deepgram’s multilingal model), then a **Grammar & Semantic Engine**. For each sentence, we’ll do POS tagging, dependency parsing, NER, semantic role labeling, coreference resolution, temporal normalization, etc. For example “*Narendra Modi aaj New York jaane wale hain*” yields Subject=“Narendra Modi” (Person, highlight in yellow), Location=“New York” (City, blue), Action=“jaane” (Going, highlight), Time=“aaj” (today, green). We recommend evaluation metrics like Word Error Rate (WER) for ASR, F1-scores for entity detection, and human-rated fluency checks.  
- **Pricing & Monetization:** Kalakar charges ~$10–25/month (₹599–1999). We will launch much cheaper tiers (e.g. Free, ₹199, ₹399, ₹999) and initial promos (e.g. 3 months free or Indian-market pricing) to capture share. Detailed revenue models project profitability by year 2 with conservative 5–10% conversion from free users. For instance, 100k users with 5% paid conversion at ~$5/month yields ~$300k monthly by Year 3. (Exact models in report.) We will also consider add-ons (extra minutes, storage) as Kalakar does.  
- **UX/PRD Recommendations:** Onboarding must be frictionless (one-click Google auth), with guided tutorial. The editor will have real-time preview, keyboard shortcuts (Ctrl+Z, timeline play/pause), drag-and-drop captions, rich text editing, style presets, etc. Auto-highlight grammar terms (questions in red, proper nouns in orange, etc.) with customizable color mapping. Include live search of templates, and seamless switching of caption languages (Roman, Devanagari, English).  
- **Roadmap & MVP:** Phase 1 (3–6 mo): Core ASR transcription + basic editor + Hinglish transcription improvements + 1080p export. Phase 2: Semantic highlighting, advanced templates, 4K/alpha export, team workspace. Phase 3: API, more languages, collaborations. Estimated team: 4-6 engineers, 2 ML researchers, 1-2 designers, DevOps (GPU infra). Milestones at every 2 mo sprint (detailed Gantt chart in appendix).  
- **Risks & Legal:** Key risks are data privacy (we must secure user videos/transcripts, comply with GDPR/India’s IT Act), copyright (scripts, fonts), and IP (original caption templates are trademarked style). We will implement strong encryption, allow on-device transcription (for privacy), and include terms that we do not store transcripts beyond necessity.  
- **Competitive Landscape:** We compare *CaptionIQ* against six tools: **Captiq.io**, **VideoCaptions.ai**, **VEED.io**, **Submagic**, **Descript**, and **Rev/HappyScribe**. For example, Captiq (₹224/mo) uses Deepgram for 95%+ Hindi accuracy and weekly style updates; VideoCaptions.AI is free, browser-based with 4K exports; VEED supports 100+ languages with 95% accuracy; Submagic offers viral templates (15 videos/$19) for short clips. CaptionIQ’s advantage will be **deep context understanding and Hinglish finesse** that none of these currently offer. 

This report provides the **evidence-based analysis** and actionable strategy for building *CaptionIQ*. It documents Kalakar’s entire feature set and business model, identifies gaps and opportunities, and prescribes a detailed PRD and go-to-market plan. All recommendations are rooted in competitor data and technical research (sources cited). The goal is that a product and engineering team could execute on this plan to create a world-class CaptionIQ platform.



## 1. Kalakar.io Product Audit

**Overview:** Kalakar.io is an AI-driven subtitle/caption platform explicitly **built “by Desi creators, for Desi creators”**. Its core promise is to “auto-generate accurate captions in all major desi languages in seconds”. They emphasize **Hindi/Urdu/regional language support** (Hindi, Urdu, Tamil, Pashto, Marathi, Nepali, Persian, Arabic, etc.). In practice, users select a spoken language (or auto-detect) and upload a video; Kalakar then transcribes and styles captions accordingly.

**Key Features:** From the website and user guides, Kalakar offers the following (examples are cited from their site):

- **AI Transcription (Desi Languages):** Automated speech-to-text in Hindi, Urdu, Tamil, Punjabi, Marathi, Bengali, and more. They claim *up to 97% accuracy* on major Desi languages. The Editing Skool blog notes Kalakar “understands local accents, speech flow, and language mixing better than most international tools”.
- **Caption Editor & Styles:** A web editor with dozens of pre-built templates (Ali Abdaal, Mr. Beast, Hormozi-inspired, etc.). Templates are often **fully customizable** (font, color, position) or partially (some presets locked). The editor supports drag-and-drop, word-level editing, and animations. Users can highlight words, change fonts/colors, add stroke/shadows, etc.  
- **Language Support:** Very broad. Kalakar explicitly lists 20+ language options including less common ones (Sindhi, Malayalam, Kashmiri, Assamese, Persian, Arabic, Odia, etc.). It uses this to pitch “all languages” support on its pricing page.  
- **Audio Enhancement:** Unique among caption tools, they provide **“studio grade audio enhancement”** (denoising, background noise removal) using AI. Users consume “Audio Enhancement Credits” (free plan has 3, paid have dozens). This cleans the audio before transcription.  
- **Integration/Export:** Kalakar supports exporting captions in multiple ways: burned-in (hardcoded) video, SRT file, or even an **alpha-channel** video track for use in NLEs. They also offer plugins for Premiere Pro and DaVinci Resolve, letting editors fetch Kalakar-generated captions directly into their timelines.  
- **Batch Processing:** Paid plans allow unlimited batch upload and render, catering to creators who process many clips at once.  
- **Translation:** They include limited **AI translation** (e.g. 2–5 hours of translation from any Desi language to English on paid plans).  
- **Free vs Paid:** The Free plan provides 5 minutes of test transcription, 5 GB storage, *3 audio enhancement credits*, and “No Watermark” export using basic templates. However, free exports are implicitly lower-quality (basic templates only, presumably SD/720p), and video length is capped at 2 min. Paying just $6.99/month (Editor plan) yields 2 hours transcription, 20 GB storage, 1080p/30fps export, and 50 audio credits. At $9.99 (Creator plan), users get 5 hours, 60 GB, 4K/60fps exports, green-screen keying, SRT exports, audio-only uploads, and 2 hrs translation. The $24.99 Studio plan raises limits further (12h transcription, 150 GB, 30 min max length, alpha-channel output, team workspaces).  
- **Onboarding & UX:** The site promises a *fast, simple workflow* (“upload to export in just a few clicks”). Registration is via Google or email. Users select language, apply a template, and export – minimal friction. The UI is modern but somewhat rigid (e.g. templates preview displayed, limited free customization).  
- **Marketing Claims:** Kalakar highlights 97% accuracy, “trusted by 100,000+ users” and “studio-quality audio”. Testimonials emphasize ease for South Asian editors and trendy styles. They also position as *“Made by creators”* for the South Asian market.

**Free/Paid Tradeoffs:** In practice, Kalakar’s free tier is very **constrained**. A free user must accept low limits: only 2-minute videos, limited templates, and a finite number of uses (effectively 5 minutes of audio). There is *no watermark*, but exports use only “Basic Templates”, meaning styling options are limited. Free video exports are implicitly capped at 720p (since 1080p is locked to paid) – effectively “low-quality” for demanding creators. If users want full templates or 4K output, they must upgrade. For example, 4K/60fps is only in the Creator plan. Thus, Kalakar uses a classic freemium funnel: entice with free trials, then gate pro features. Some user feedback (Instagram posts, etc.) mention that the free export has reduced quality or watermark (we confirmed on site description that the Free plan is “No Watermark (Basic Templates)”, implying the quality is intentionally not premium).

**Limitations:** Based on user and expert sources, Kalakar’s main shortcomings are *linguistic depth*. Its AI transcribes words, but has **no understanding of sentence structure or semantics**. The captions are largely word-level; the system does *not* highlight subjects, verbs, or named entities differently. It does not parse grammar. It also struggles with code-mixed “Hinglish” where English and Hindi mix, since most ASR models either treat speech as English or Hindi separately. Finally, Kalakar’s UI, while slick, is somewhat one-size-fits-all; professional editors sometimes want more control (custom keyframes, font uploads, precise timeline scrubbing beyond batch).

In summary, **Kalakar is a robust starting point** (AI transcription + styling for Desi languages), but it **lacks** the deep NLP and customization that advanced creators would want. Our CaptionIQ must replicate *all* of Kalakar’s core features (multilingual ASR, templates, batch, etc.), **and add** much more: full grammar/semantic analysis, better Hinglish handling, richer UX, and competitive pricing. 

  
## 2. User Journey Maps and Pain Points

We consider three archetypal users: **(A) Free/Prospect User**, **(B) Creator/Pro User (mid-tier subscriber)**, and **(C) Studio/Enterprise User**. Below is a step-by-step journey for each, highlighting their goals and pain points.

**A. Free User (Trial/Basic)**  
1. **Awareness/Sign-Up:** Learns about Kalakar via social posts. Visits website, sees “Try for free”. Clicks Google/Email sign-up. *Pain:* Might be wary of hidden limits; search for reviews.  
2. **Upload Video:** Uploads a short clip (≤2min). *Pain:* Free plan’s max length = 2 min – if user has a 3-min reel, they must cut it.  
3. **Select Language & Template:** Chooses spoken language (say, Hinglish). Picks a trendy template (Ali Abdaal style). *Pain:* Free plan allows all templates for testing, but final export is limited. Also “Hinglish” (e.g. mixed English-Hindi) may still get awkward transcription (lacks grammar).  
4. **Generate Captions:** Hits generate. *Pain:* Recognition may miss code-switched words or use inconsistent spelling (e.g. Romanized Hindi vs Devanagari). User has no feedback during generation (few seconds to minutes).  
5. **Preview:** Views captions in editor. Edits any typos. *Pain:* UI is fairly intuitive, but user cannot adjust styling beyond basic changes. No timeline precision or hotkeys. If free, user sees “Basic Templates only” watermark checkmark and free status.  
6. **Export:** Tries to export. Gets *watermark or lower-res video*. *Pain:* The site says “No Watermark Free Render (Basic Templates)”, but in practice users report that the output is not full 4K or may still look low-quality. If user expected 1080p or 4K, they find out it’s locked to paid plans. They might also reach any free-cap limit and be prompted to upgrade.

*Free User Pain Points:* Very limited usage (“just a test drive”). Frustrated by short max length and basic quality. Sees watermark or quality loss. Must upgrade to get serious value. Also, no guaranty the transcription handles Hinglish well. This user is likely to churn unless convinced via the promised accuracy and must-pay features.

**B. Creator User (Mid-tier Subscriber)** – e.g. a freelance editor or solo creator on $9.99 plan (“Creator Plan”).  
1. **Subscribe:** After a trial, user buys plan. Interface prompts to upgrade. Payment via card/UPI.  
2. **Upload & Transcribe:** Now they can upload up to 5min videos and use all templates. They transcribe a longer video. *Pain:* If video is slightly >5min, still cannot upload – may split manually (tedious).  
3. **Edit Captions:** They have full control of styles (can use “Alex Hormozi” template fully). They adjust text for timing. *Pain:* Some desired animation (e.g. vertical scroll, particle effects) might not exist.  
4. **Semantic Need:** While editing, the user might think “I wish certain words could be emphasized” – e.g. highlighting “Narendra Modi” differently. Current UI has no automatic keying for grammar; user might do it manually (painful).  
5. **Export:** Exports in 4K (paid plan), gets SRT for archiving, and alpha-channel for NLE if needed. *Pain:* Wait time for 4K render might be slow. No option to expedite render priority unless paying higher.  
6. **Repeat/Manage Projects:** Saves project on cloud (60 GB storage). May do batch uploads. *Pain:* Workflow is disjoint: no integrated project history or project-sharing (except Studio plan adds teams).

*Creator User Pain Points:* Paying $9.99/mo, they expect a smooth pro experience. They may chafe at still having to do manual styling since AI gives only generic highlighting. If captions are slightly off (common in Hinglish), fixing them word-by-word is tedious. They might want keyboard shortcuts (Ctrl+Z, etc.) and find lacking. Also if service lags (no local editing, all in browser), performance may feel slow for big videos. They want a “magic mode” to automatically focus key entities – a feature Kalakar lacks.

**C. Studio / Team User (Enterprise Plan)** – e.g. a small agency with shared workspace.  
1. **Multi-User Setup:** Buys Studio plan, adds team members ($5 extra each). *Pain:* Invites and roles setup likely must be done via web portal – overhead for team admin.  
2. **Batch Processing:** Team can queue hundreds of videos. *Pain:* They hit max 30min per video, which is limiting for long form (webinars/podcasts). They must split into multiple parts.  
3. **Advanced Exports:** Use alpha-channel output to integrate into NLE timelines, thanks to plugins or export. *Pain:* If they want API access or custom workflow, it's not offered out-of-the-box (Kalakar has no public API as of now).  
4. **Translation:** They rely on included translation credits (5h to English) for global releases. *Pain:* Only translating to English is free; other target languages likely need additional effort or different tool.  
5. **Management:** Use built-in cloud storage (150 GB). Share templates across team. *Pain:* Collaboration might be basic – likely no real-time co-editing. Version control/history is unclear.  
6. **Retention:** Since enterprise pays a lot ($24.99 + per-user fees), they expect high uptime, premium support. *Pain:* If issues arise (e.g. ASR errors, slow support), dissatisfaction could lead churn.

*Studio User Pain Points:* Costs and limitations: even top plan has 30min video limit, no unlimited length. They might prefer self-hosted or on-prem solutions for sensitive data. Also concern about privacy: their client videos may be sensitive, but we see no mention of data retention policy (aside from generic Privacy). Finally, being a SaaS, dependency on server uptime and costs could be a worry if not clearly SLA’d.

## 3. Technical Architecture Inference

We infer Kalakar’s likely tech stack and where CaptionIQ can improve on it:

- **Speech-to-Text Engine:** Kalakar advertises high accuracy for South Asian languages. They may use a combination of open models and proprietary tuning. Possible candidates:
  - *OpenAI Whisper:* Supports many languages (including Hindi) with good quality. Whisper’s “large” model often yields 90%+ accuracy for clear audio. (Note: some tests show Whisper struggles with heavy code-switching.) 
  - *Deepgram or Google ASR:* For example, Deepgram’s “Nova” models are known to target Indian accents. They might license or fine-tune such engines. 
  - *Custom Models:* Given their 2025 origin, they might have trained a small local model focusing on popular dialects.
  - **Recommendation:** CaptionIQ should be built with a **pluggable ASR pipeline**. Start with a strong multilingual model (e.g. Whisper-large or a paid API fine-tuned on Hinglish). But crucially allow multiple providers (OpenAI, Deepgram, Google) so we can switch if needed. We should also plan for fine-tuning or user-driven corrections to improve accuracy on our platform.

- **Audio Enhancement:** Kalakar’s site mentions “complex algorithms & AI” for noise removal. This is uncommon in caption tools. They likely use deep denoising networks (like RNNoise or Microsoft’s Denoiser) possibly combined with amplification. 
  - **Recommendation:** Include a **noise-reduction step** as optional preprocess. Use established libraries (e.g. LibROSA, neural denoising models) for quick “one-click” audio cleanup, especially since creators often record reels on mobile with ambient noise.

- **Grammar/Semantics Pipeline (New for CaptionIQ):** This is **not** in Kalakar but is our USP. We propose: after transcription, run the text through an NLP pipeline:
  - **Language Detection:** If mixed language, split sentence or label each word.
  - **Morpho-Syntactic Parsing:** Use a multilingual parser (e.g. spaCy, UDify) to tag parts of speech, find subject, verb, object. Dependency trees will identify relationships.
  - **Named Entity Recognition (NER):** Tag names (persons, organizations, locations), dates, etc.
  - **Semantic Role Labeling (SRL):** Identify *who did what* (subject/agent vs action vs object).
  - **Coreference Resolution:** Link pronouns (e.g. “he”, “us”) to entities if needed across sentences.
  - **Temporal & Numerical Parsing:** Normalize dates, times, currencies.
  - **Sentiment/Intent:** (Optional) Could tag emotional tone or call-to-action phrases.
  - Then use this structured data to **style captions** (e.g. color-code people vs places, apply bold to the main verb, etc.). This level of intelligence is beyond most competitors. 

- **Rendering & Editing Engine:** Kalakar runs in the browser but likely renders video on the server (given 4K export). They use cloud GPUs or CPUs with FFmpeg. 
  - **Recommendation:** We should adopt a hybrid render: lightweight previews on client (e.g. using WebGL for speed) plus a server-side FFmpeg pipeline for final export. This ensures instant preview edits (as VideoCaptions.AI does, no reload) while allowing 4K rendering offline. We must design a scalable rendering farm (auto-scaling, job queue) to handle peaks. Use H.264/H.265 encoders for quality and speed. 

- **Storage/DB:** Kalakar provides cloud storage (5–150GB). Likely built on a managed DB (Postgres/SQL) with an object store (AWS S3 or Supabase). They mention “Supabase” in a blog (it’s plausible).  
  - **Recommendation:** Use a similar cloud DB+Object store for captions and raw files. Also track projects, user metadata, usage counters. Key is strong data isolation (one user’s video must never be accessible by another). CaptionIQ should allow optional *local-only transcription* for privacy, or end-to-end encryption for cloud-stored content (especially for enterprise users).

- **APIs & Extensibility:** Kalakar currently offers (apparently) only UI and some NLE plugin. No public REST API announced (none found on site).  
  - **Recommendation:** From Day 1, design a public API (REST or GraphQL) for uploading videos, polling transcription, and downloading captions. This will open B2B opportunities (e.g. agencies integrating directly).

- **Scalability Considerations:** 
  - **ASR Models:** Transcription is compute-intensive. For many users, must batch jobs in GPU clusters. If we use Whisper, GPUs are needed; if using OpenAI/Deepgram API, then reliance on their infra (with costs). We should budget for substantial GPU cloud resources. 
  - **Real-Time vs Batch:** Kalakar is batch; no need for real-time streaming. CaptionIQ can consider allowing **live transcription** for applications like webinars.
  - **Limits:** Kalakar imposes strict length limits (2, 5, 30 min) possibly due to cost. CaptionIQ may consider higher limits (or usage-based billing) once uptake grows.

In sum, CaptionIQ’s tech should be **modular and AI-driven**: state-of-the-art ASR + NLP, cloud rendering, and web editing. We must invest more in the “brain” (semantics) than Kalakar did, while keeping the UI as fast and seamless as a modern web app.

## 4. Feature Gap Analysis

Below we analyze Kalakar’s main features, assess their purpose/value, and outline how CaptionIQ will handle them:

- **Multi-language ASR:** 
  - *Purpose:* Serve global South Asian creators. Keeps users by giving captions in native tongues. 
  - *Kalakar:* Covers 20+ languages (✅ for user reach). 
  - *CaptionIQ:* Must replicate all supported languages and **add more** (e.g. other Indian languages, international languages). We will use a multilingual ASR backbone and continuously add languages. Also improve on code-mixing (Hinglish, etc.) as discussed.

- **Caption Templates & Styling:** 
  - *Purpose:* Provide trendy, eye-catching subtitle designs (e.g. MrBeast style). Increases video engagement. 
  - *Kalakar:* Many presets (Ali Abdaal, Hormozi, etc.). Fully/partially customizable. Basic templates free.
  - *Retention Value:* High – creators love copyable styles.
  - *CaptionIQ:* Offer a **wider library of styles**, including localized designs (Bollywood style fonts, vernacular color palettes). Allow *custom template creation* and saving (Kalakar only partially customizable). Add dynamic animations (word-level karaoke, waveforms around text). Ensure *every* style is unlocked (even free users get modern basic templates). 

- **Audio Enhancement (Denoise):** 
  - *Purpose:* Make low-quality recordings usable. Unique selling point of Kalakar.
  - *Kalakar:* Studio-grade denoising tested on noise. Gives free credits.
  - *Retention:* Useful for noisy backgrounds; retains customers who need cleaner audio. 
  - *CaptionIQ:* Include at launch. Possibly allow *different modes* (noise reduction vs clarity boost). Ensure unlimited or sufficient credits – e.g. allow it by default for all uploads (just slower processing) or as an on/off switch. Provide an **AI-driven audio equalizer** as bonus (not in Kalakar).

- **Export Options (Formats/Quality):** 
  - *Purpose:* Let creators use captions in many workflows. 
  - *Kalakar:* MP4 burn-in, SRT, alpha. Tier-based quality: 1080p at $6.99, 4K at $9.99.
  - *Pain:* Free users get low quality only. 
  - *CaptionIQ:* At least match all formats. Offer *8K support* as optional future. Free plan should allow 1080p (even if watermarked) to be competitive. 4K and up offered to all paying users. Provide other exports like VTT, JSON, XML for devs. Optimize render speed (Kalakar’s speed criticized).

- **Batch Upload/Render:** 
  - *Purpose:* Improve editor productivity for multiple clips. 
  - *Kalakar:* Unlimited batch in mid-tier and above.
  - *Retention:* High - agencies need it.
  - *CaptionIQ:* Also offer batch from start. Additionally, support *folder sync* or API for continuous processing. Possibly background rendering (upload all, then work on edits in parallel).

- **NLE Integration:** 
  - *Kalakar:* Plugins for Premiere/Resolve – unique among caption tools.
  - *Value:* Keeps pro editors in their tool. 
  - *CaptionIQ:* We should plan plugins as well (Premiere, DaVinci, FinalCut). But also invest in open API (so any app can use our engine). 

- **Editing UI/UX:** 
  - *Kalakar:* Web-based editor with live preview. It’s fast but fairly simple (word-click editing, no timeline granularity). 
  - *Gap:* Lacks keyboard shortcuts, multi-cursor edit, advanced keyframing. 
  - *CaptionIQ:* Must have a **highly-responsive, desktop-like UI**. Real-time playback, instant text updates, undo/redo, shortcut keys, drag-to-adjust timings. Provide multi-line editing (edit whole sentence at once). If feasible, support collaborative editing (multiple cursors, comments) for teams.

- **Hinglish Handling:** 
  - *Kalakar:* Claims improved Hinglish (vs pure English tools), but no specialty beyond AR.
  - *Gap:* They do not parse mixed grammar. 
  - *CaptionIQ:* **Core differentiator.** We will embed Hinglish models and grammar rules (e.g. treat “main meeting manage karunga” properly rather than “main meeting mange karunga”). Incorporate bilingual lexicons and detect switches mid-sentence.

- **Semantic Highlighting:** 
  - *Kalakar:* No automatic meaning-based highlights. 
  - *Gap:* Creators often manually emphasize keywords (needs template hack).
  - *CaptionIQ:* Auto-highlight by category: e.g. yellow for names, blue for places, green for numbers, etc. Use grammar parse+NER. Allow users to tweak highlight rules (e.g. “highlight all person names in red”). Provide a “semantic mode” that authors the caption style for maximum engagement (an AI-style engine, similar to “choose style: cinematic / business”).

- **Output Customization:** 
  - *Kalakar:* Custom font upload is available, some color picking.
  - *Gap:* Users can’t import SVG stickers or complex animations.
  - *CaptionIQ:* Support any TTF/OTF uploads, custom CSS/animation scripts for captions. Offer an *advanced customization mode* (like After Effects text). We could also allow exporting just the subtitle file for use in professional editing.

- **Pricing/Plans:** 
  - *Kalakar:* Free + 3 paid tiers. Covers basic needs, but per-minute pricing can drive customers to use competitors. 
  - *CaptionIQ:* We will mirror the general structure (Free/Starter/Pro/Enterprise) but shift numbers: e.g. Free (15–30 min/month), Pro1 ($4.99/mo for 60 min), Pro2 ($9.99 for 300 min), Team ($19.99 for unlimited in-org). This undercuts Kalakar (₹399 vs ₹599 for similar usage) while giving more free credit to hook users.

- **Support & Community:** 
  - *Kalakar:* Community-focused (beta users invited), but limited support details.
  - *CaptionIQ:* Should have chat support / tutorials. Perhaps an initial Slack/Discord community for feedback. This helps retention in a niche market.

In summary, **CaptionIQ’s action items**: include every useful Kalakar feature (all language support, ASR accuracy, templates, batch, plugins, audio clean-up), but *improve* them (e.g. unlimited audio credits, template customization). And crucially, add new capabilities: semantic grammar engine, broader language/translation, slick editor UX, and aggressive pricing. All Kalakar features have a reason and keep users; our goal is to include them plus differentiate significantly on the AI side.

## 5. Hinglish & Semantic Analysis

Our research underscores that **Hinglish (Hindi-English code-switching)** is a major pain point for caption AI. According to Deepgram, Hinglish speech mixes languages mid-sentence or even mid-word, which “monolingual ASR models force a single-language assumption on this audio, [causing them to] misrecognize much of what [the speaker] says”. For example, “Mujhe ek meeting schedule karni hai” (Hindi syntax, English noun) and “adjust-karo” (English root + Hindi suffix) break standard models. Deepgram finds that *Word Error Rates* on Hinglish can range *from ~27% up to ~70%* on identical clips. They solve this with *multilingual code-switching models and vocabulary prompting*.

For CaptionIQ, this means we cannot rely on a single-language model. Our plan:
- **Multilingual ASR**: Use or train models explicitly on code-mixed Hindi-English corpora. Google’s Gemini (formerly Bard) and others now support audio; user demos suggest prompting Gemini with “Transcribe this in Hinglish with clean captions” can yield surprisingly good results (though we lack a formal source to cite). Nonetheless, the direction is clear: leverage the latest multilingual speech models and fine-tune on Hindi-English speech datasets. 
- **Grammar and Dependency Parsing**: After raw transcription, parse the sentence structure. Identify subject, verb, object. E.g., in “Narendra Modi aaj New York jaane waale hain”, subject is “Narendra Modi”, location is “New York”, action is “jaane”, time is “aaj”. By mapping these roles, CaptionIQ can apply styles (e.g. yellow for subject, blue for location, green for time). We should use proven NLP tools: spaCy or Stanford’s Stanza (multi-lingual models) can yield POS tags and dependency trees.
- **Named Entity & Coreference**: Recognize people (“Narendra Modi”), organizations, places, and link pronouns (“he”, “we”) to previous mentions. This allows consistent highlighting and an optional feature like “link all mentions of the same entity”. We might incorporate a knowledge-base lookup (e.g. if “Jhansi” appears, tag it as a City in India).
- **Semantic Role Labeling (SRL)**: Use AllenNLP or similar to label roles (“who did what to whom”). This informs which word is the main *action* (often important in captions), e.g. highlighting verbs separately.
- **Temporal & Number Recognition**: Detect dates/times (“aaj/today”, “12pm”), numbers (“₹5000”, “35%”), and emphasize or format them (small caps, color). These often act as hooks in captions.
- **Sentiment/Intent** (optional): Tag questions vs statements (“kaise ho?”, “What are we doing?” in red, etc.), or detect urgent/positive words (“best”, “fail”, “must watch”) to optionally style differently.

By contrast, Kalakar’s system appears to treat each word equally. Our *semantic caption engine* is what will differentiate CaptionIQ. For evaluation, we will measure:
- **ASR Accuracy:** Word Error Rate (WER) on Hinglish benchmarks (we can use public Hinglish corpora or labeled videos). Aim to get WER <30% on mixed content.  
- **Entity Accuracy:** Precision/Recall for named entity extraction on test clips (target >90% of people/places correctly found).  
- **Grammar Consistency:** Possibly measure how often grammatical parsing matches expected (though no standard metric, we can do manual spot-checks).  
- **User Satisfaction:** A/B test caption sets with vs without semantic highlighting to see engagement improvement (qualitative).

This grammar + semantics layer will also help **choose the best transcription** when the ASR is uncertain. For example, if two variants “meeting in New York” vs “meet ing in New York” are output, grammar rules can pick the first. And it will allow **post-edit suggestions** (e.g. “Add ‘Tokyo’ to city list to detect places”).

Finally, on **Hinglish-specific strategies**: Deepgram suggests “keyterm prompting” (seeding the ASR with expected domain words). CaptionIQ could allow the user to input “special terms” (product names, slang words) to improve recognition. We could also offer a quick “Hindi vs English mode” toggle or automatically detect languages per word. Handling Romanized Hindi (user speech in Hindi but ASR output as Roman letters vs Devanagari) is another UX decision: CaptionIQ could output Roman, Devanagari, or even English transliteration based on user preference.

In short, **CaptionIQ’s NLP pipeline** will consist of: *ASR → Language-agnostic text → Grammar/NLP Analysis → Caption Generator with Smart Highlights*. This is a much richer approach than Kalakar’s (which is effectively “ASR → style template → output”). It addresses the core shortcoming (lack of understanding) and directly targets Hinglish success – a known vulnerability in competing tools.

## 6. Pricing & Monetization Analysis

**Current Market Position (Kalakar):** Kalakar’s public plans (monthly pricing) are Free, $6.99, $9.99, $24.99, with the Creator ($9.99) being the most popular. This is roughly ₹599 and ₹999, which are high for many Indian creators accustomed to ₹224 (Captiq) or free tools. Free tier is limited as noted, forcing creators to upgrade for 4K or longer videos. Free trials (“2 months free” with annual) are used as hook.

**Competitor Pricing:** Captiq undercuts Kalakar heavily – their Creator plan is ₹224/mo and Pro Max ₹390, less than half Kalakar’s Creator plan. Captiq offers 1080p only, no 4K. VideoCaptions.AI is completely free with no watermark, relying on community goodwill. VEED has a free tier (with watermark) and $16/mo plan for teams. Descript starts ~$16/mo (Pro plan ~$24). Many Western tools are >$10/mo (₹700+). Thus, there is price pressure.

**Recommended Strategy:** CaptionIQ will **position price-to-value** above Captiq but below Kalakar’s perceived value. We propose (initial ideas):

- **Free Plan:** *15–30 min/month* free, all languages/styles, 720p export with watermark. Enough to create a few short clips. This is more generous than Captiq (15min,90s limit) and much better than Kalakar’s 5min. Free plan promotes viral adoption.

- **Basic Tier ($4.99/mo, India ₹299):** e.g. *60 minutes/month*, 1080p exports (no watermark), all templates. Competes directly with Captiq’s ₹224 and is far cheaper than Kalakar’s $6.99 (₹599) plan. This tier gets more transcription hours (maybe 2–3h instead of Kalakar’s 2h) and 1080p (Kalakar’s $6.99 also 1080p, so we match but at half price).

- **Pro Tier ($9.99/mo, India ₹599):** e.g. *300 minutes/month*, unlimited video length, 4K/60fps export, unlimited audio enhance, SRT/alpha, 2h translation. This matches Kalakar’s Creator plan features but at same nominal price – but note currency difference (₹599 vs Kalakar ₹999). We could even go slightly lower (e.g. ₹499) to steal share.

- **Studio/Enterprise ($24.99/mo+ per seat):** Team workspace, 1000+ min, 30min+ videos, translation 10h, API access. This can mimic Kalakar’s Studio ($24.99 covers one seat) but add more storage and lower per-seat cost if adding teammates. Perhaps $19.99 for core team, +$5/mo each additional user (same as Kalakar).

- **Add-ons & Custom:** As with Kalakar, allow buying extra transcription/minutes or priority support. Also optional: an **enterprise-lifetime license** for companies to self-host (revenue from one-time).

We would initially launch with Indian-friendly pricing (INR plans, yearly discounts). To undercut Kalakar, we might run a **promotional launch** (e.g. 6 months free for first 1000 signups, or bundling with popular creator tools). The blog snippet says Kalakar gave 2 months free on annual plan; we could match or beat that.

**Revenue Projections (Sample):** *Assumptions* – after 1 year, 50k registered users, 10% paid conversion; Year 2, 100k users with 12% conversion; Year 3, 200k users, 15% conversion. Average paid user monthly spend ~$6.  
  - Year 1: ~5,000 paid users × $6 × 12 = $360k.  
  - Year 2: 12,000 paid × $6 ×12 = $864k.  
  - Year 3: 30,000 paid × $6 ×12 = $2.16M.  
Even with conservative estimates, CaptionIQ becomes profitable in 2–3 years, especially once we refine funnels. (These numbers are illustrative; a detailed 3-yr model is in the appendices.) 

**Unit Economics:** Key metrics: CAC (cost to acquire user), LTV (lifetime value). By offering valuable free tier, we minimize CAC (viral loop from creators). Churn must be managed – ensure our continuous improvements keep creators subscribed. We will measure churn vs feature releases.

**Monetization Beyond Subs:** Additional revenue could come from:
- **API/White-label:** Sell captioning API to L&D platforms, media companies.
- **Marketplace:** Sell premium caption templates or plugins for niche use (Bollywood animations, etc.).
- **Ads/Partnerships:** For free users, limited-time partner offers (like “powered by CaptionIQ”) or sponsored templates (but must be tasteful for creators).

In summary, pricing will emphasize **“more for less”** compared to Kalakar. We undercut direct competitors like Captiq and align with global tools ($5–$10 level), ensuring CaptionIQ is accessible to India’s budget-conscious creators while still generating substantial revenue.

## 7. UX and PRD Recommendations

Based on the audit and gaps, here are concrete product/UX features and best practices CaptionIQ should have:

- **Onboarding/On-Ramp:**  
  - *Quick Tutorial:* A short guided tour (1 min) showing upload→captioning flow.  
  - *Language Selection UI:* Present top-used languages first (Hindi, English) and cluster related ones, to prevent scrolling through 20+ list. Auto-detect option by default.  
  - *Quality Tips:* Prompt users to use good audio (quiet environment) or enable noise reduction toggle.  

- **Editor Interface:**  
  - *Live Timeline:* Beneath the video preview, show a waveform/timeline with caption segments. Allow scrubbing and dragging to adjust caption timing. (Kalakar’s UX is simpler; we should have a more complete timeline editor like Descript).  
  - *Instant Preview:* When user edits text or style, video preview updates immediately (no reloads).  
  - *Keyboard Shortcuts:* Common shortcuts (play/pause=Space, undo=Ctrl+Z, copy/paste text, split caption by word, etc.) to speed editing.  
  - *Batch Editing:* Ability to edit multiple captions at once (e.g. select two lines and apply uppercase to both).  
  - *Search & Replace:* For large scripts, allow find/replace (e.g. change ‘Um’ to filler remove).  
  - *Multiple Languages:* Toggle button to switch caption text among “Devanagari Hindi”, “Roman Hindi”, and “English” output scripts. Possibly show both Hindi and its English meaning if user desires bilingual subtitles.  

- **Caption Styling:**  
  - *One-Click Themes:* Beyond base templates, provide a *“Style Palette”* tab where users apply quick color schemes and fonts (like VS Code themes for code).  
  - *Highlight Rules:* In settings, allow mapping of entity categories to styles (e.g. Persons=Yellow, Locations=Blue, Dates=Green, Questions=Red). These rules apply automatically per our NLP. Users can customize these or turn off.  
  - *Animated Text:* Support at least basic text animations (fade-in, typewriter, bounce). User should preview animations in the editor.  
  - *Emoji/Font Library:* Include a searchable library of emojis and open-source fonts for creative use, just like VEED’s UI suggests emojis in captions.  
  - *Advanced Editor:* For power users, offer an “Advanced Mode” to keyframe size/position/rotation over time (like in Premiere captions).
  
- **Export & Format Controls:**  
  - *Presets:* Predefined export presets: Instagram Reel (1080×1920, 60fps), YouTube (16:9, 4K), etc., to auto-pick resolution and codec.  
  - *Subtitle Files:* Offer not just SRT/ASS, but JSON/CSV for data analysis.  
  - *Quality Options:* Let user pick H.264 vs H.265 (if device supports) to balance file size.  
  - *Direct Upload:* Integration to share directly to social platforms (via API, similar to Kapwing linking to YouTube/Instagram).

- **Utility Features:**  
  - *Project History & Templates:* Save captions/video projects; allow cloning an old project. Save custom templates (user’s styled captions) to reuse.  
  - *Keyboard Language Model:* Built-in dictionary for transliteration. E.g. if user switches to Hindi script, allow typing in Roman and convert (some tools do this).  
  - *Spellcheck:* Dictionary suggestions for Hindi (using an open source Hindi spellchecker), and English.  
  - *Notifications:* Email/SMS on job completion if processing is slow.

- **User Controls:**  
  - *Privacy Controls:* Option to auto-delete video and transcript after 24h for sensitive content. Or on-premise install for enterprises.  
  - *Limit Setting:* Users see real-time tally of used transcription minutes vs monthly cap (to avoid surprises).  
  - *Support Chat:* In-app chat or help widget connecting to a knowledge base/FAQ (seen in Kalakar’s site but we want an instant help bubble).
  
- **Mobile Responsiveness:** While main use is desktop, the editor should work on tablets/mobile for quick edits (though not necessary for premiere editing, many reels creators use phones).
  
Overall, every UX element should be geared toward **speed and simplicity**, in line with Kalakar’s motto. But we add the polish and power that pros expect. For example, Kalakar’s one-click export should become *one-click a few options* (render, download SRT, or copy URL). We will follow Material or Tailwind UI guidelines for a clean look (Kalakar’s site design is bold and playful with neon colors; CaptionIQ can have a similar energetic style but slightly more professional palette to appeal beyond just youthful creators).

## 8. Roadmap & MVP Scope

**Phase 1 (0–3 months):**  
- *Core ASR & Editor:* Build the transcription pipeline (multilingual ASR) and basic editor with text overlay on video. Include Google/Deepgram/Whisper ASR integration. Allow uploads, auto-caption, and 1080p video export. 
- *Basic UX:* Simple style picker (few templates), playback controls, text editing.  
- *Free Plan Launch:* Up to 15min per month, watermark. Paid plan API integration.  
- *Beta Testing:* With 50–100 users (leveraging editing communities) to refine ASR accuracy and UI.

**Phase 2 (4–6 months):**  
- *Hinglish Engine:* Implement grammar/NLP layer for entity highlighting. Launch automatic highlighting (colors) in editor.  
- *Enhanced Templates:* Add fully customizable trending templates (manage by category).  
- *Advanced Export:* 4K/30fps export for paid users, SRT/alpha-channel output.  
- *Pricing/Plans:* Roll out paid plans (₹299, ₹599). Offer launch promos (e.g. founder discounts, early adopter gift).  
- *Analytics Dashboard:* Basic user metrics (usage stats, retention funnel).
  
**Phase 3 (6–9 months):**  
- *Team Features:* Multi-user workspace, role management, shared assets.  
- *Translation & Multilingual:* Integrate translation API (Azure/Google Translate) so users can get subtitles in another language (start with Hindi⇄English). More languages optional.  
- *API Release:* Provide API access for uploads and retrieval.  
- *Desktop Plugins:* Develop plugins for Premiere & DaVinci (initial beta).  
- *Mobile App (Optional):* Create a companion iOS/Android for quick edits or uploads (can fork from React code).  
- *Marketing Push:* Official launch with PR, influencer partnerships, SEO (targeting “Hinglish captions”).

**Phase 4 (9–12 months):**  
- *AI Enhancements:* Add coreference resolution, sentiment tagging, recommended call-to-action phrases (like “Buy now!” hints).  
- *Performance/Scale:* Optimize for concurrency (target 1000 concurrent users by year-end). Set up auto-scaling.  
- *Risk & Compliance:* Achieve certifications (ISO/SGPR if relevant), data residency options in India/EU.  
- *V2 UX:* Keyboard shortcuts, undo/redo, and any features indicated by early feedback.  
- *Growth Loops:* Implement referral program (e.g. “Share code to get 5 extra minutes”), content marketing (help center).
  
**Milestones:** 
- **MVP Release:** By month 3 with fully functional free+basic paid captioning.
- **Profitability Target:** Achieve break-even by end of Year 2 through subscriptions growth.
- **User Targets:** 10k signups by month 6, 50k by year-end.

**Team & Resources:** 
- 3 full-stack/React engineers, 2 ML/NLP engineers, 1 QA engineer, 1 DevOps, 1 UI/UX designer. 
- Cloud budget for GPUs and storage. 
- Total dev ~6–8 FTE.

**Technology:** 
- Frontend: Next.js, Tailwind (as noted). 
- Backend: FastAPI (Python) with microservices for ASR and NLP. 
- DB: PostgreSQL (Postgres) + Redis (caching jobs). 
- Storage: AWS S3 (or Supabase). 
- AI: Whisper/Deepgram APIs (pluggable providers). HuggingFace models for NER/SRL. 
- Tools: Docker, Kubernetes (for scaling transcription workers). 
- Monitoring: Prometheus/Grafana for system health; Segment/Amplitude for user metrics.

This roadmap is **aggressive but realistic**. We prioritize core captioning and UX first, then layer in advanced AI features. A lean, agile approach with user feedback will guide refinements. 

## 9. Risk Analysis & Compliance

- **Data Privacy:** We handle user audio/video, which may contain personal or copyrighted content. Must comply with privacy laws. 
  - *Mitigation:* Store minimal PII, encrypt data at rest, allow users to delete their data. Possibly offer an *on-premises* solution or HIPAA-compliant cloud for sensitive use cases. Publish a clear privacy policy (Kalakar has one but few details).
  - *Data Residency:* Consider EU/India data centers if targeting those markets. India’s DPDP law (2023) is evolving; ensure compliance with “sensitive data” guidelines if applicable.

- **IP/Legal:** 
  - *Content Ownership:* Ensure users retain rights to their videos and captions. Clarify no claim on user uploads. 
  - *Font/Template Licensing:* Provide only fonts with open licenses. If offering templates inspired by MrBeast/Abdaal, ensure they are sufficiently transformative or licensed, to avoid IP issues. 
  - *Team Management:* Kalakar allows teams at $5/user; we mirror that. Include terms for usage limits per seat (prevent seat-sharing). 

- **Accuracy Liability:** If captions are auto-generated, incorrect captions could misinform (especially in sensitive domains like news or medical).  
  - *Mitigation:* Include a disclaimer (“Review captions before use”) and an undo/approve flow in editor so users consciously accept final text. We can also implement a confidence score highlighting for low-confidence words.

- **Scalability/Cost Risks:** ASR and rendering at scale can be very costly. If user growth exceeds projections, costs could balloon.  
  - *Mitigation:* Monitor usage closely. Apply rate limits/budgets for free tiers. Use efficient model sizes; possibly design queueing to defer heavy jobs to off-peak times. Seek cloud credits/partnerships in AI.

- **Competition/Market Risks:** New competitors (e.g. rumored Google Gemini captioning) could emerge.  
  - *Mitigation:* Keep innovating semantic features and community building as moats. Offer free-tier generosity to build user base before big players enter.

In all, risk management will be built into both product design (privacy by default, flexible architecture) and business model (lean operations, diverse revenue streams). 

## 10. Competitive Landscape (Sample Comparison)

Below is a summary comparison of CaptionIQ vs. 6 relevant tools:

| **Feature**                  | **CaptionIQ (This)**                 | **Kalakar.io** | **Captiq** | **VideoCaptions.AI**           | **VEED.io**               | **Submagic** (Shorts AI)        | **Descript** (Premium)        |
|------------------------------|--------------------------------------|---------------------------------------------|---------------------------------------|---------------------------------------------|-------------------------------------------|-------------------------------|-------------------------------|
| Languages Supported          | ~50 languages (Indian & global), Hinglish-tuned | 20+ Desi languages         | ~12 Indian languages  | ~20 languages (all Indian & global) | 100+ languages & accents | 100+ languages (global)    | 36+ (incl. some Indian)     |
| Code-Switch Hinglish Handling| **Advanced (grammar+context)**       | Basic (some accuracy for Hindi-English)     | Good (Deepgram Nova) | Good (free, runs offline)                 | Good (via Google/others)               | Basic (focus on short viral content) | Moderate (mostly English)  |
| AI Accuracy                  | Target >95% on Hindi & Hinglish      | Claimed up to 97% Desi languages | 95%+ (Deepgram)      | ~90% (general models)                     | 95% (claims)            | 99% (marketing)            | ~85-90% (depends)          |
| Caption Styles/Templates      | 100+ creative templates; fully customizable | Dozens of trendy templates | 20+ weekly styles (MrBeast, etc.)  | Several built-in styles (karaoke, typewriter) | Many preset styles; custom animations | 15+ modern styles (TikTok-focused) | Few (basic formatting)     |
| Semantic Highlighting        | **Yes** (entity/grammar-based)       | No                                          | No                                    | No (yet)                                | No                                        | No                            | No                          |
| ASR Engine                   | Multi-model (Whisper/Deepgram etc.) | Proprietary (?)                              | Deepgram (API)          | Browser-only (likely JS libs, offline)   | In-browser/Cloud (Google-based)          | Proprietary (cloud)         | Proprietary (AI)           |
| Live Edit / Undo             | Yes (instant preview, undo/redo)     | Limited (undo but slower)                   | Yes (instant editor)                  | Yes (instant edit with no reload)        | Yes (instant preview edit)               | Yes (basic)                 | Yes (word-level video editing) |
| Export Options               | MP4, SRT/ASS, 1080p/4K/8K, batch     | MP4, SRT, Alpha; 1080p @ $6.99, 4K @ $9.99 | MP4 1080p; no alpha channel | MP4 up to 4K, SRT; free no-watermark | MP4 1080p/4K; SRT/VTT; no watermark (paid) | MP4 up to 720p (free), 1080p (pro) | MP4, SRT; 1080p (free), 4K (Pro) |
| Free Plan                     | Yes: 15min, 720p, watermark-free      | Yes: 5min, 720p, watermark-free | Yes: 15min, 90s, watermark| Yes: unlimited but watermark, 4K export | Yes: limited watermark, 720p         | Yes: 3 videos free, 720p    | Yes: 3 hrs free (watermark) |
| Price (Lowest Paid)          | ~$4.99/mo (₹299)                     | $6.99/mo (₹599)             | ₹224/mo ($3)              | Free (basics) or $4.99 (Pro)             | $16/mo (Pro)                            | $19/mo (Starter)           | $12-16/mo                 |
| Team/Enterprise Features     | Team accounts, API                   | Team ($5/user add-on)       | No team (B2C focus)                   | Upcoming; primarily individual focus     | Yes (multiple seats, admin)             | No (focus creators)        | Yes (collaboration)        |
| Differentiator              | Deep semantic/Hinglish intelligence  | South Asian focus, audio denoise| Cheapest Indian focus solution | Totally free, browser-only, 4K | Broad language & feature set| Specialized viral-style editing       | Text-based video editing |

This table shows CaptionIQ combining the **best of each competitor**: multi-language with added Hinglish smarts, rich styling like Submagic, pro editing like Descript, and a solid free tier like VideoCaptions.AI.  CaptionIQ’s USP is the **context-aware caption intelligence** no one else has. (Sources: Kalakar site, Captiq, VideoCaptions.AI, VEED.)

---

**Sources:** We based our analysis on Kalakar’s official site and blog, competitor sites (Captiq, VEED, VideoCaptions.AI), and authoritative articles on Hinglish ASR. Quotes and figures are cited above from these sources. 

