import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, Zap, Languages, Mic, Film, Download, ArrowRight,
  CheckCircle2, Play, Star, ChevronRight, Globe, Wand2, LayoutTemplate,
  AudioLines, Brain, Subtitles
} from "lucide-react";

// ── Animated caption demo words with entity types ──────────────────────────
const DEMO_WORDS = [
  { text: "Rahul", entity: "person" },
  { text: "ne", entity: null },
  { text: "Mumbai", entity: "location" },
  { text: "mein", entity: null },
  { text: "shoot", entity: "action" },
  { text: "kiya", entity: "action" },
];

// ── Template Demo Chips ────────────────────────────────────────────────────
const TEMPLATE_DEMOS = [
  { name: "Mr Beast", font: "Anton", color: "#FFE600", bg: "rgba(0,0,0,0.92)", stroke: true, upper: true },
  { name: "Hormozi", font: "Montserrat", color: "#ffffff", bg: "#000000", stroke: false, upper: true, weight: 900 },
  { name: "Luxury",  font: "Cormorant Garamond", color: "#D4AF37", bg: "transparent", stroke: false, upper: true, weight: 300, spacing: "0.3em" },
  { name: "Cinematic", font: "Outfit", color: "#E5C07B", bg: "transparent", stroke: false, upper: true, weight: 400, spacing: "0.18em" },
  { name: "Gaming",  font: "Russo One", color: "#ffffff", bg: "#7C3AED", stroke: true, upper: true },
  { name: "News",    font: "Oswald", color: "#ffffff", bg: "#DC2626", stroke: false, upper: true },
];

// ── Features List ──────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Brain,
    title: "Semantic AI Intelligence",
    desc: "Our AI understands meaning — not just words. Persons, places, and actions are auto-highlighted in every caption.",
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
  {
    icon: Languages,
    title: "Hinglish & 15+ Languages",
    desc: "Native Hinglish (Roman Hindi) support with code-switching detection. Hindi, Urdu, Tamil, Punjabi and more.",
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    icon: LayoutTemplate,
    title: "16 Creator Templates",
    desc: "MrBeast, Hormozi, Luxury, Cinematic and more. Every template is fully customizable and export-ready.",
    color: "text-purple-500",
    bg: "bg-purple-50",
  },
  {
    icon: AudioLines,
    title: "Studio-Grade Audio Cleanup",
    desc: "AI noise reduction preprocesses your audio before transcription — cleaner audio means better accuracy.",
    color: "text-green-500",
    bg: "bg-green-50",
  },
  {
    icon: Film,
    title: "Burn-In Video Export",
    desc: "Download a fully rendered MP4 with captions baked in — your selected template, your style, perfectly styled.",
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
  {
    icon: Wand2,
    title: "AI Social Media Content Kit",
    desc: "From your transcript, instantly generate YouTube titles, Instagram captions, hooks, hashtags, and CTAs.",
    color: "text-rose-500",
    bg: "bg-rose-50",
  },
];

// ── Pricing Plans ──────────────────────────────────────────────────────────
const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    badge: null,
    features: ["15 min/month transcription", "All 16 templates", "720p video export", "SRT/VTT download", "AI Semantic Highlighting"],
    cta: "Start Free",
    primary: false,
  },
  {
    name: "Creator",
    price: "₹299",
    period: "per month",
    badge: "Most Popular",
    features: ["60 min/month transcription", "1080p video export", "Audio denoise included", "AI Content Kit", "Priority support"],
    cta: "Get Creator",
    primary: true,
  },
  {
    name: "Pro",
    price: "₹599",
    period: "per month",
    badge: null,
    features: ["300 min/month transcription", "4K video export", "Batch processing", "SRT + ASS + Alpha", "Custom font upload"],
    cta: "Get Pro",
    primary: false,
  },
  {
    name: "Studio",
    price: "₹999",
    period: "per month",
    badge: null,
    features: ["Unlimited transcription", "Team workspace", "API access", "White-label export", "Dedicated support"],
    cta: "Contact Us",
    primary: false,
  },
];

// ── Comparison Table ───────────────────────────────────────────────────────
const COMPARISON = [
  { feature: "Hinglish AI", captioniq: true, kalakar: "Partial", captiq: false },
  { feature: "Semantic Highlighting", captioniq: true, kalakar: false, captiq: false },
  { feature: "16+ Templates", captioniq: true, kalakar: true, captiq: "20+" },
  { feature: "Audio Denoise", captioniq: true, kalakar: true, captiq: false },
  { feature: "Burn-In Video Export", captioniq: true, kalakar: true, captiq: false },
  { feature: "AI Content Kit", captioniq: true, kalakar: false, captiq: false },
  { feature: "Animated Captions", captioniq: true, kalakar: true, captiq: false },
  { feature: "Auto Emojis", captioniq: true, kalakar: false, captiq: false },
  { feature: "Free Plan Quality", captioniq: "1080p", kalakar: "720p", captiq: "1080p" },
  { feature: "Starting Price", captioniq: "₹299/mo", kalakar: "₹599/mo", captiq: "₹224/mo" },
];

// ── Testimonials ───────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: "Priya Sharma",
    handle: "@priyacreates",
    avatar: "PS",
    color: "bg-purple-100 text-purple-700",
    text: "CaptionIQ ka semantic highlighting feature ek game changer hai. Pehle mujhe manually persons aur places highlight karne padte the — ab AI khud kar deta hai! Mera editing time 60% kam ho gaya.",
  },
  {
    name: "Arjun Mehta",
    handle: "@arjunedits",
    avatar: "AM",
    color: "bg-blue-100 text-blue-700",
    text: "Kalakar se compare karo toh CaptionIQ bahut better hai. Hinglish transcription almost perfect hai, aur burn-in video export ka quality dekh ke dil khush ho gaya!",
  },
  {
    name: "Sneha Reddy",
    handle: "@snehavlogs",
    avatar: "SR",
    color: "bg-green-100 text-green-700",
    text: "AI Content Kit mera favourite feature hai. Ek click mein YouTube title, Instagram caption, aur hashtags ready! Kalakar mein ye feature hi nahi hai. Total value for money.",
  },
];

// ── Helper: check/cross render ─────────────────────────────────────────────
function Cell({ v }) {
  if (v === true) return <span className="text-green-600 font-semibold">✓</span>;
  if (v === false) return <span className="text-red-400">✗</span>;
  return <span className="text-gray-700 text-sm">{v}</span>;
}

// ── Animated Demo Caption ──────────────────────────────────────────────────
function AnimatedCaption() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setActiveIdx((i) => (i + 1) % DEMO_WORDS.length);
    }, 650);
    return () => clearInterval(t);
  }, []);

  const entityColor = (type) => {
    if (type === "person") return "#FACC15";
    if (type === "location") return "#60A5FA";
    if (type === "action") return "#4ADE80";
    return "#ffffff";
  };

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {DEMO_WORDS.map((w, i) => (
        <span
          key={i}
          style={{
            fontFamily: "'Anton', sans-serif",
            fontSize: "clamp(22px, 3.5vw, 40px)",
            color: i === activeIdx ? "#FA5D29" : entityColor(w.entity),
            fontWeight: 400,
            textTransform: "uppercase",
            letterSpacing: "0.02em",
            WebkitTextStroke: "1px rgba(0,0,0,0.5)",
            paintOrder: "stroke fill",
            textShadow: "0 3px 10px rgba(0,0,0,0.6)",
            transform: i === activeIdx ? "scale(1.14)" : "scale(1)",
            transition: "transform 150ms ease, color 150ms ease",
            display: "inline-block",
          }}
        >
          {w.text}
        </span>
      ))}
    </div>
  );
}

// ── Scrolling template preview carousel ───────────────────────────────────
function TemplateCarousel() {
  const [active, setActive] = useState(0);
  const sampleText = "Rahul ne Delhi mein shoot kiya";

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap justify-center">
        {TEMPLATE_DEMOS.map((tpl, i) => (
          <button
            key={tpl.name}
            type="button"
            onClick={() => setActive(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              active === i
                ? "border-[#FA5D29] bg-orange-50 text-[#FA5D29] shadow-sm"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            {tpl.name}
          </button>
        ))}
      </div>
      <div className="h-32 bg-gray-950 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner">
        <span
          style={{
            fontFamily: `'${TEMPLATE_DEMOS[active].font}', sans-serif`,
            color: TEMPLATE_DEMOS[active].color,
            backgroundColor: TEMPLATE_DEMOS[active].bg,
            fontWeight: TEMPLATE_DEMOS[active].weight || 700,
            letterSpacing: TEMPLATE_DEMOS[active].spacing || "0.01em",
            textTransform: TEMPLATE_DEMOS[active].upper ? "uppercase" : "none",
            padding: TEMPLATE_DEMOS[active].bg !== "transparent" ? "4px 18px" : 0,
            borderRadius: "6px",
            WebkitTextStroke: TEMPLATE_DEMOS[active].stroke ? "2px #000" : "0",
            paintOrder: "stroke fill",
            fontSize: "clamp(16px, 2.8vw, 26px)",
            textShadow: "0 2px 8px rgba(0,0,0,0.6)",
          }}
        >
          {sampleText}
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Main Landing Page Component
// ──────────────────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans overflow-x-hidden">

      {/* ── Google Fonts preload ──────────────────────────────────────── */}
      <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&family=Inter:wght@400;500;600;700&family=Anton&family=Montserrat:wght@400;600;700;800;900&family=Cormorant+Garamond:wght@300;400&family=Russo+One&family=Oswald:wght@400;600&display=swap"
        rel="stylesheet"
      />

      {/* ── Sticky Nav ───────────────────────────────────────────────── */}
      <header
        data-testid="landing-header"
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-200" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-18 flex items-center justify-between py-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#FA5D29] flex items-center justify-center shadow-sm">
              <Sparkles className="h-4.5 w-4.5 text-white" strokeWidth={2.5} style={{ height: 18, width: 18 }} />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              Caption<span className="text-[#FA5D29]">IQ</span>
            </span>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#templates" className="hover:text-gray-900 transition-colors">Templates</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
            <a href="#compare" className="hover:text-gray-900 transition-colors">Compare</a>
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/login")}
              data-testid="landing-signin-btn"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => navigate("/signup")}
              data-testid="landing-signup-btn"
              className="inline-flex items-center gap-2 bg-[#FA5D29] hover:bg-[#E04C1E] text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              Start Free <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-28 overflow-hidden">
        {/* Subtle background grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(ellipse 80% 50% at 50% -20%, rgba(250,93,41,0.08) 0%, transparent 70%),
              linear-gradient(rgba(229,231,235,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(229,231,235,0.5) 1px, transparent 1px)
            `,
            backgroundSize: "auto, 50px 50px, 50px 50px",
          }}
        />

        <div className="relative max-w-5xl mx-auto px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-[#FA5D29] text-xs font-semibold px-4 py-1.5 rounded-full mb-6 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            India's #1 AI Caption Intelligence Platform
          </div>

          {/* Headline */}
          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.08] mb-6"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Captions That
            <br />
            <span className="text-[#FA5D29]">Actually Understand</span>
            <br />
            What You're Saying
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            The only caption tool with deep Hinglish AI, semantic word highlighting,
            16 creator templates, and studio-quality video export — all in one platform.
          </p>

          {/* CTA Row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <button
              type="button"
              onClick={() => navigate("/signup")}
              data-testid="hero-signup-btn"
              className="inline-flex items-center gap-2 bg-[#FA5D29] hover:bg-[#E04C1E] text-white font-bold px-8 py-4 rounded-2xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 text-base"
            >
              Start Free — No Credit Card <ArrowRight className="h-4.5 w-4.5" style={{ height: 18, width: 18 }} />
            </button>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-8 py-4 rounded-2xl border border-gray-200 hover:border-gray-300 shadow-sm transition-colors text-base"
            >
              <Play className="h-4 w-4 text-[#FA5D29]" /> Sign In
            </button>
          </div>

          {/* Live caption demo */}
          <div className="relative max-w-3xl mx-auto">
            <div className="bg-gray-950 rounded-3xl overflow-hidden shadow-2xl border border-gray-800">
              {/* Fake video controls bar */}
              <div className="h-8 bg-gray-900 flex items-center px-4 gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                <span className="text-xs text-gray-500 ml-2">CaptionIQ Studio Preview</span>
              </div>
              {/* Video placeholder area */}
              <div className="h-52 md:h-64 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center gap-2 relative">
                <p className="text-xs text-gray-500 mb-4 uppercase tracking-widest">Live Caption Preview</p>
                <AnimatedCaption />
                {/* Entity legend */}
                <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
                  <span className="text-xs font-medium" style={{ color: "#FACC15" }}>● Person</span>
                  <span className="text-xs font-medium" style={{ color: "#60A5FA" }}>● Location</span>
                  <span className="text-xs font-medium" style={{ color: "#4ADE80" }}>● Action</span>
                  <span className="text-xs font-medium text-[#FA5D29]">● Active Word</span>
                </div>
              </div>
            </div>
            {/* Glow effect */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-12 bg-[#FA5D29]/20 rounded-full blur-2xl pointer-events-none" />
          </div>

          {/* Social proof pill */}
          <p className="text-sm text-gray-400 mt-10">
            Trusted by <span className="font-semibold text-gray-700">1,000+ creators</span> making Reels, Shorts & YouTube content in India
          </p>
        </div>
      </section>

      {/* ── Feature Pills Row ─────────────────────────────────────────── */}
      <section className="py-6 bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex items-center gap-6 overflow-x-auto pb-1 scrollbar-hide justify-center flex-wrap">
            {[
              "Hinglish AI ✦",
              "Semantic Highlight ✦",
              "16 Templates ✦",
              "Audio Denoise ✦",
              "Burn-In Export ✦",
              "AI Content Kit ✦",
              "Undo / Redo ✦",
              "Keyboard Shortcuts ✦",
            ].map((pill) => (
              <span
                key={pill}
                className="text-xs font-semibold text-gray-500 whitespace-nowrap tracking-wide"
              >
                {pill}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ────────────────────────────────────────────── */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2
              className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-4"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Built for Indian Creators
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Every feature designed to save time, improve quality, and outperform any competing tool.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group"
              >
                <div className={`h-11 w-11 rounded-xl ${feat.bg} flex items-center justify-center mb-4`}>
                  <feat.icon className={`h-5 w-5 ${feat.color}`} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {feat.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Template Showcase ─────────────────────────────────────────── */}
      <section id="templates" className="py-24 bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-4"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              16 Creator Templates
            </h2>
            <p className="text-lg text-gray-500">
              Designed by creators, for creators. Pick a style and make it yours.
            </p>
          </div>
          <TemplateCarousel />
          <p className="text-center text-sm text-gray-400 mt-5">
            + Minimal, Modern, Podcast, News, Finance, Shorts, Gaming, Education, Bold Impact, Hype, Ali Abdaal, Motivation…
          </p>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2
              className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-4"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              From Upload to Export in 3 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: Film,
                title: "Upload Your Video",
                desc: "Drop any MP4, MOV, or audio file. We extract the audio and send it through our AI pipeline.",
                color: "text-orange-500",
                bg: "bg-orange-50",
              },
              {
                step: "02",
                icon: Brain,
                title: "AI Understands Your Speech",
                desc: "Whisper transcribes, GPT tags persons/locations/actions. Every word has a timestamp.",
                color: "text-purple-500",
                bg: "bg-purple-50",
              },
              {
                step: "03",
                icon: Download,
                title: "Export Your Creation",
                desc: "Download the styled MP4, or export SRT/VTT for NLEs. Your template, burned in perfectly.",
                color: "text-green-500",
                bg: "bg-green-50",
              },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm text-center">
                  <div className="text-xs font-bold text-gray-300 tracking-widest mb-3">{s.step}</div>
                  <div className={`h-12 w-12 rounded-2xl ${s.bg} flex items-center justify-center mb-4 mx-auto`}>
                    <s.icon className={`h-6 w-6 ${s.color}`} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
                {/* Arrow connector */}
                {s.step !== "03" && (
                  <div className="hidden md:flex absolute top-1/2 -right-4 -translate-y-1/2 z-10">
                    <ChevronRight className="h-8 w-8 text-gray-200" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-b from-orange-50/50 to-gray-50">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Creators Love CaptionIQ
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold ${t.color}`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.handle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison Table ─────────────────────────────────────────── */}
      <section id="compare" className="py-24 bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              className="text-4xl font-extrabold tracking-tight text-gray-900 mb-4"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              How We Compare
            </h2>
            <p className="text-gray-500">See why creators are switching to CaptionIQ</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Feature</th>
                  <th className="px-5 py-4 text-center">
                    <span className="inline-flex items-center gap-1.5 font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                      <span className="h-5 w-5 rounded-lg bg-[#FA5D29] flex items-center justify-center">
                        <Sparkles className="h-3 w-3 text-white" strokeWidth={2.5} />
                      </span>
                      CaptionIQ
                    </span>
                  </th>
                  <th className="px-5 py-4 text-center text-xs font-semibold text-gray-500">Kalakar.io</th>
                  <th className="px-5 py-4 text-center text-xs font-semibold text-gray-500">Captiq</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-5 py-3.5 font-medium text-gray-700">{row.feature}</td>
                    <td className="px-5 py-3.5 text-center text-[#FA5D29] font-bold"><Cell v={row.captioniq} /></td>
                    <td className="px-5 py-3.5 text-center"><Cell v={row.kalakar} /></td>
                    <td className="px-5 py-3.5 text-center"><Cell v={row.captiq} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2
              className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-4"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Pricing That Makes Sense
            </h2>
            <p className="text-gray-500 text-lg">
              Half the price of Kalakar. More features than anyone else.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-white rounded-2xl border p-6 flex flex-col shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${
                  plan.primary ? "border-[#FA5D29] ring-2 ring-orange-100 shadow-md" : "border-gray-200"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FA5D29] text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    {plan.badge}
                  </div>
                )}
                <div className="mb-5">
                  <h3 className="font-bold text-gray-900 text-base mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>{plan.price}</span>
                    <span className="text-xs text-gray-400">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => navigate("/signup")}
                  data-testid={`pricing-cta-${plan.name.toLowerCase()}`}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    plan.primary
                      ? "bg-[#FA5D29] hover:bg-[#E04C1E] text-white shadow-sm"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-orange-50 via-white to-gray-50">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <div className="h-14 w-14 rounded-2xl bg-[#FA5D29] flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Sparkles className="h-7 w-7 text-white" strokeWidth={2.5} />
          </div>
          <h2
            className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-4"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Start Creating Smarter Captions Today
          </h2>
          <p className="text-lg text-gray-500 mb-8">
            Join thousands of creators who've already made the switch. No credit card needed.
          </p>
          <button
            type="button"
            onClick={() => navigate("/signup")}
            data-testid="final-cta-btn"
            className="inline-flex items-center gap-2 bg-[#FA5D29] hover:bg-[#E04C1E] text-white font-bold px-10 py-4 rounded-2xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 text-base"
          >
            Get Started Free <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-200 py-10">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[#FA5D29] flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                Caption<span className="text-[#FA5D29]">IQ</span>
              </span>
            </div>
            <div className="flex items-center gap-7 text-sm text-gray-500">
              <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
              <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
              <a href="#compare" className="hover:text-gray-900 transition-colors">Compare</a>
              <button type="button" onClick={() => navigate("/login")} className="hover:text-gray-900 transition-colors">Sign In</button>
            </div>
            <p className="text-xs text-gray-400">
              © 2026 CaptionIQ · Built for Indian Creators
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
