import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { VideoStage } from "@/components/VideoStage";
import { CaptionEditor } from "@/components/CaptionEditor";
import { TemplateBar } from "@/components/TemplateBar";
import { getTemplate, resolveStyle, DEFAULT_TEMPLATE_ID, DEFAULT_SETTINGS } from "@/lib/templates";
import { api, API, formatApiErrorDetail } from "@/lib/api";

// Transform the frozen CaptionDocument into the shape the preview components expect.
function docToResult(doc) {
  if (!doc || !doc.words?.length) return null;
  const words = doc.words.map((w) => ({
    text: w.text, start: w.start, end: w.end, entity_type: w.entity_type || null,
  }));
  const segments = (doc.segments || []).map((s) => ({ start: s.start, end: s.end, text: s.text }));
  return { words, segments };
}

function buildLines(result) {
  if (!result || !result.words?.length) return [];
  const { words, segments } = result;
  if (!segments?.length) {
    return [{ start: words[0].start, end: words[words.length - 1].end, words }];
  }
  return segments
    .map((seg) => ({
      start: seg.start,
      end: seg.end,
      words: words.filter((w) => w.start >= seg.start - 0.05 && w.start < seg.end + 0.05),
    }))
    .filter((l) => l.words.length > 0);
}

// Break the transcript into short, punchy display chunks (~4 words) for the video
// overlay — independent of Whisper's segment lengths, so captions never cover the video.
function buildChunks(words, { maxWords = 4, maxGap = 0.7, maxDur = 2.4 } = {}) {
  if (!words?.length) return [];
  const chunks = [];
  let cur = [];
  for (const w of words) {
    if (cur.length === 0) {
      cur = [w];
      continue;
    }
    const start = cur[0].start;
    const gap = w.start - cur[cur.length - 1].end;
    if (cur.length >= maxWords || gap > maxGap || w.end - start > maxDur) {
      chunks.push(cur);
      cur = [w];
    } else {
      cur.push(w);
    }
  }
  if (cur.length) chunks.push(cur);
  return chunks.map((ws) => ({ start: ws[0].start, end: ws[ws.length - 1].end, words: ws }));
}

export default function Studio() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [project, setProject] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // ---- Caption Template Engine state (client-side; persisted per project) ----
  const STORAGE_KEY = `captioniq:style:${projectId}`;

  const readSaved = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) {
        return {
          templateId: saved.templateId || DEFAULT_TEMPLATE_ID,
          settings: { ...DEFAULT_SETTINGS, ...(saved.settings || {}) },
        };
      }
    } catch {
      /* ignore */
    }
    return { templateId: DEFAULT_TEMPLATE_ID, settings: DEFAULT_SETTINGS };
  };

  // Lazy init so the saved value loads synchronously BEFORE any save effect runs
  // (prevents a StrictMode double-mount race from clobbering the stored template).
  const [templateId, setTemplateId] = useState(() => readSaved().templateId);
  const [settings, setSettings] = useState(() => readSaved().settings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ templateId, settings }));
  }, [STORAGE_KEY, templateId, settings]);

  const resolvedStyle = useMemo(
    () => resolveStyle(getTemplate(templateId), settings),
    [templateId, settings]
  );
  const handleSettingsChange = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/projects/${projectId}`);
        setProject(data);
        setResult(docToResult(data.caption_document));
      } catch (e) {
        toast.error("Project not found");
        navigate("/dashboard", { replace: true });
      } finally {
        setPageLoading(false);
      }
    })();
  }, [projectId, navigate]);

  const videoUrl = useMemo(
    () => (project?.media_id ? `${API}/projects/${projectId}/media` : null),
    [project, projectId]
  );

  const lines = useMemo(() => buildLines(result), [result]);
  const chunks = useMemo(() => buildChunks(result?.words), [result]);

  const activeWord = useMemo(() => {
    if (!result?.words) return null;
    return result.words.find((w) => currentTime >= w.start && currentTime < w.end) || null;
  }, [result, currentTime]);

  const activeLineIndex = useMemo(() => {
    if (!lines.length) return -1;
    return lines.findIndex((l) => currentTime >= l.start && currentTime < l.end);
  }, [lines, currentTime]);

  const activeChunkIndex = useMemo(() => {
    if (!chunks.length) return -1;
    return chunks.findIndex((c) => currentTime >= c.start && currentTime < c.end);
  }, [chunks, currentTime]);

  const overlayWords = useMemo(() => {
    if (activeChunkIndex < 0) return [];
    return chunks[activeChunkIndex].words.map((w) => ({ ...w, active: w === activeWord }));
  }, [chunks, activeChunkIndex, activeWord]);

  // Show a styled preview chunk (first word active) when paused, so switching
  // templates immediately reveals colour / background / active-word styling.
  const previewWords = useMemo(() => {
    if (overlayWords.length) return overlayWords;
    if (currentTime < 0.25 && chunks.length) {
      return chunks[0].words.map((w, i) => ({ ...w, active: i === 0 }));
    }
    return [];
  }, [overlayWords, chunks, currentTime]);

  const handleTranscribe = async () => {
    setTranscribing(true);
    setResult(null);
    try {
      const { data } = await api.post(`/projects/${projectId}/transcribe`);
      if (!data.words?.length) {
        toast.error("No speech detected in this clip.");
      } else {
        setResult(docToResult(data));
        toast.success("Captions generated with semantic highlighting!");
      }
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Transcription failed");
    } finally {
      setTranscribing(false);
    }
  };

  const handleSeek = (t) => {
    if (videoRef.current) {
      videoRef.current.currentTime = t;
      videoRef.current.play().catch(() => {});
    }
  };

  if (pageLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-[#FA5D29]" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50 overflow-hidden">
      <AppHeader />
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 md:p-6 lg:p-8 flex-1 min-h-0">
        <section className="lg:col-span-7 flex flex-col h-full gap-3 min-h-[320px]">
          <div className="flex-1 bg-black rounded-2xl overflow-hidden relative shadow-lg group min-h-0">
            <VideoStage
              videoUrl={videoUrl}
              videoRef={videoRef}
              words={previewWords}
              style={resolvedStyle}
              onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
              onChangeVideo={() => navigate("/dashboard")}
            />
          </div>
          <TemplateBar
            value={templateId}
            onSelect={setTemplateId}
            settings={settings}
            onSettingsChange={handleSettingsChange}
          />
        </section>

        <CaptionEditor
          lines={lines}
          loading={transcribing}
          hasVideo={Boolean(project?.media_id)}
          onTranscribe={handleTranscribe}
          activeLineIndex={activeLineIndex}
          activeWord={activeWord}
          onSeek={handleSeek}
        />
      </main>
    </div>
  );
}
