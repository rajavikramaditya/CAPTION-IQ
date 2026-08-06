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
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) {
        setTemplateId(saved.templateId || DEFAULT_TEMPLATE_ID);
        setSettings({ ...DEFAULT_SETTINGS, ...(saved.settings || {}) });
      } else {
        setTemplateId(DEFAULT_TEMPLATE_ID);
        setSettings(DEFAULT_SETTINGS);
      }
    } catch {
      /* ignore */
    }
  }, [STORAGE_KEY]);

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

  const activeWord = useMemo(() => {
    if (!result?.words) return null;
    return result.words.find((w) => currentTime >= w.start && currentTime < w.end) || null;
  }, [result, currentTime]);

  const activeLineIndex = useMemo(() => {
    if (!lines.length) return -1;
    return lines.findIndex((l) => currentTime >= l.start && currentTime < l.end);
  }, [lines, currentTime]);

  const overlayWords = useMemo(() => {
    if (activeLineIndex < 0) return [];
    return lines[activeLineIndex].words.map((w) => ({ ...w, active: w === activeWord }));
  }, [lines, activeLineIndex, activeWord]);

  // Always show a caption line for styling (first line when nothing is active).
  const previewWords = useMemo(() => {
    if (overlayWords.length) return overlayWords;
    if (lines.length) return lines[0].words.map((w) => ({ ...w, active: false }));
    return [];
  }, [overlayWords, lines]);

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
