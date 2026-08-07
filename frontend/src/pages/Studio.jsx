import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Download, FileText, Captions, FileCode2, AlignLeft, Sparkles, ScrollText, Film, AlertTriangle, CheckCircle2, Undo2, Redo2, Search } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { VideoStage } from "@/components/VideoStage";
import { CaptionEditor } from "@/components/CaptionEditor";
import { ContentPanel } from "@/components/ContentPanel";
import { TemplateBar } from "@/components/TemplateBar";
import { SearchReplacePanel } from "@/components/SearchReplacePanel";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { getTemplate, resolveStyle, DEFAULT_TEMPLATE_ID, DEFAULT_SETTINGS } from "@/lib/templates";
import { api, API, formatApiErrorDetail } from "@/lib/api";
import { useCaptionHistory } from "@/hooks/useCaptionHistory";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a short unique id for new segments created by split */
function shortId(prefix = "s") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Transform the frozen CaptionDocument into the shape the preview components
 * expect. IDs are preserved so edits can be mapped back to the source doc.
 */
function docToResult(doc) {
  if (!doc || !doc.words?.length) return null;
  const words = doc.words.map((w) => ({
    id: w.id,
    text: w.text,
    start: w.start,
    end: w.end,
    entity_type: w.entity_type || null,
  }));
  const segments = (doc.segments || []).map((s) => ({
    id: s.id,
    start: s.start,
    end: s.end,
    text: s.text,
    word_ids: s.word_ids || [],
  }));
  return { words, segments };
}

function buildLines(result) {
  if (!result || !result.words?.length) return [];
  const { words, segments } = result;
  if (!segments?.length) {
    return [{ id: "s_all", start: words[0].start, end: words[words.length - 1].end, words }];
  }
  const wordById = Object.fromEntries(words.map((w) => [w.id, w]));
  return segments
    .map((seg) => ({
      id: seg.id,
      start: seg.start,
      end: seg.end,
      words: (seg.word_ids || []).map((wid) => wordById[wid]).filter(Boolean),
    }))
    .filter((l) => l.words.length > 0);
}

/**
 * Break the transcript into short, punchy display chunks (~4 words) for the
 * video overlay — independent of Whisper's segment lengths.
 */
function buildChunks(words, { maxWords = 4, maxGap = 0.7, maxDur = 2.4 } = {}) {
  if (!words?.length) return [];
  const chunks = [];
  let cur = [];
  for (const w of words) {
    if (cur.length === 0) { cur = [w]; continue; }
    const start = cur[0].start;
    const gap = w.start - cur[cur.length - 1].end;
    if (cur.length >= maxWords || gap > maxGap || w.end - start > maxDur) {
      chunks.push(cur); cur = [w];
    } else { cur.push(w); }
  }
  if (cur.length) chunks.push(cur);
  return chunks.map((ws) => ({ start: ws[0].start, end: ws[ws.length - 1].end, words: ws }));
}

// ---------------------------------------------------------------------------
// Studio Component
// ---------------------------------------------------------------------------

export default function Studio() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [project, setProject] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [saveStatus, setSaveStatus] = useState("saved");
  const [activeTab, setActiveTab] = useState("transcript"); // "transcript" | "content"
  const [showSearch, setShowSearch] = useState(false);

  // Language selector — persisted per project
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem(`captioniq:lang:${projectId}`) || "hinglish"; }
    catch { return "hinglish"; }
  });
  const handleLanguageChange = useCallback((val) => {
    setLanguage(val);
    localStorage.setItem(`captioniq:lang:${projectId}`, val);
  }, [projectId]);

  const [denoise, setDenoise] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`captioniq:denoise:${projectId}`)) ?? true; }
    catch { return true; }
  });

  const handleDenoiseChange = useCallback((val) => {
    setDenoise(val);
    localStorage.setItem(`captioniq:denoise:${projectId}`, JSON.stringify(val));
  }, [projectId]);

  // Undo / Redo history
  const {
    captionDoc, setCaptionDoc, resetHistory, push: pushHistory,
    undo: historyUndo, redo: historyRedo, canUndo, canRedo,
  } = useCaptionHistory(null);

  // ---- Caption Template Engine state (persisted per project in localStorage) ----
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
    } catch { /* ignore */ }
    return { templateId: DEFAULT_TEMPLATE_ID, settings: DEFAULT_SETTINGS };
  };

  // Lazy init — prevents StrictMode double-mount race from clobbering stored template
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

  // ---- Load project ----
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/projects/${projectId}`);
        setProject(data);
        const doc = data.caption_document;
        resetHistory(doc);
        setResult(docToResult(doc));
        // Hydrate visual template style from MongoDB if present
        if (doc.style && doc.style.template_id) {
          setTemplateId(doc.style.template_id);
          if (doc.style.overrides) {
            setSettings(doc.style.overrides);
          }
        }
      } catch (e) {
        toast.error("Project not found");
        navigate("/dashboard", { replace: true });
      } finally {
        setPageLoading(false);
      }
    })();
  }, [projectId, navigate, resetHistory]);

  // ---- Save caption document to backend (debounced) ----
  const saveTimerRef = useRef(null);

  const handleSaveCaptionDoc = useCallback(async (updatedDoc) => {
    setSaveStatus("saving");
    clearTimeout(saveTimerRef.current);
    // Embed the current styling parameters into the CaptionDocument schema style field
    const docWithStyle = {
      ...updatedDoc,
      style: {
        template_id: templateId,
        overrides: settings,
      },
    };
    saveTimerRef.current = setTimeout(async () => {
      try {
        await api.put(`/projects/${projectId}/caption`, { caption_document: docWithStyle });
        setSaveStatus("saved");
      } catch (e) {
        setSaveStatus("error");
        toast.error("Failed to save edits. Please try again.");
      }
    }, 500);
  }, [projectId, templateId, settings]);

  // Save styling configurations to MongoDB automatically when changed by user
  useEffect(() => {
    if (!captionDoc) return;
    const docWithStyle = {
      ...captionDoc,
      style: {
        template_id: templateId,
        overrides: settings,
      },
    };
    handleSaveCaptionDoc(docWithStyle);
  }, [templateId, settings, handleSaveCaptionDoc]);


  // ---- Word update ----
  const handleWordUpdate = useCallback((wordId, patch) => {
    setCaptionDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev); // save to undo stack
      const words = prev.words.map((w) =>
        w.id === wordId ? { ...w, ...patch } : w
      );
      // Rebuild segment texts and boundaries for affected segments
      const segments = prev.segments.map((seg) => {
        const segWords = words.filter((w) => seg.word_ids.includes(w.id));
        if (!segWords.length) return seg;
        return {
          ...seg,
          text: segWords.map((w) => w.text).join(" "),
          start: segWords[0].start,
          end: segWords[segWords.length - 1].end,
        };
      });
      const updated = { ...prev, words, segments, word_count: words.length };
      setResult(docToResult(updated));
      handleSaveCaptionDoc(updated);
      return updated;
    });
  }, [handleSaveCaptionDoc, pushHistory]);

  // ---- Word delete ----
  const handleWordDelete = useCallback((wordId) => {
    setCaptionDoc((prev) => {
      if (!prev) return prev;
      const words = prev.words.filter((w) => w.id !== wordId);
      const segments = prev.segments.map((seg) => {
        if (!seg.word_ids.includes(wordId)) return seg;
        const remaining = seg.word_ids.filter((id) => id !== wordId);
        const segWords = words.filter((w) => remaining.includes(w.id));
        return {
          ...seg,
          word_ids: remaining,
          text: segWords.map((w) => w.text).join(" "),
          start: segWords[0]?.start ?? seg.start,
          end: segWords[segWords.length - 1]?.end ?? seg.end,
        };
      }).filter((seg) => seg.word_ids.length > 0);
      const updated = { ...prev, words, segments, word_count: words.length };
      setResult(docToResult(updated));
      handleSaveCaptionDoc(updated);
      return updated;
    });
  }, [handleSaveCaptionDoc]);

  // ---- Segment split — split segment at splitFromWordId ----
  const handleSegmentSplit = useCallback((segmentId, splitFromWordId) => {
    setCaptionDoc((prev) => {
      if (!prev) return prev;
      const segIdx = prev.segments.findIndex((s) => s.id === segmentId);
      if (segIdx === -1) return prev;
      const seg = prev.segments[segIdx];
      const splitIdx = seg.word_ids.indexOf(splitFromWordId);
      if (splitIdx <= 0) return prev; // nothing to split if it's the first word

      const beforeIds = seg.word_ids.slice(0, splitIdx);
      const afterIds = seg.word_ids.slice(splitIdx);
      const wordById = Object.fromEntries(prev.words.map((w) => [w.id, w]));

      const beforeWords = beforeIds.map((id) => wordById[id]).filter(Boolean);
      const afterWords = afterIds.map((id) => wordById[id]).filter(Boolean);

      const updatedSeg = {
        ...seg,
        word_ids: beforeIds,
        text: beforeWords.map((w) => w.text).join(" "),
        end: beforeWords[beforeWords.length - 1]?.end ?? seg.end,
      };
      const newSeg = {
        id: shortId("s"),
        start: afterWords[0]?.start ?? seg.end,
        end: seg.end,
        word_ids: afterIds,
        text: afterWords.map((w) => w.text).join(" "),
      };

      const segments = [
        ...prev.segments.slice(0, segIdx),
        updatedSeg,
        newSeg,
        ...prev.segments.slice(segIdx + 1),
      ];
      const updated = { ...prev, segments };
      setResult(docToResult(updated));
      handleSaveCaptionDoc(updated);
      return updated;
    });
  }, [handleSaveCaptionDoc]);

  // ---- Segment merge — merge segment with next one ----
  const handleSegmentMerge = useCallback((segmentId) => {
    setCaptionDoc((prev) => {
      if (!prev) return prev;
      const segIdx = prev.segments.findIndex((s) => s.id === segmentId);
      if (segIdx === -1 || segIdx >= prev.segments.length - 1) return prev;
      const s1 = prev.segments[segIdx];
      const s2 = prev.segments[segIdx + 1];
      const merged = {
        ...s1,
        word_ids: [...s1.word_ids, ...s2.word_ids],
        text: [s1.text, s2.text].filter(Boolean).join(" "),
        end: s2.end,
      };
      const segments = [
        ...prev.segments.slice(0, segIdx),
        merged,
        ...prev.segments.slice(segIdx + 2),
      ];
      const updated = { ...prev, segments };
      setResult(docToResult(updated));
      handleSaveCaptionDoc(updated);
      return updated;
    });
  }, [handleSaveCaptionDoc]);

  const videoUrl = useMemo(
    () => (project?.media_id ? `${API}/projects/${projectId}/media` : null),
    [project, projectId]
  );

  const lines = useMemo(() => buildLines(result), [result]);
  const chunks = useMemo(
    () => buildChunks(result?.words, { maxWords: settings?.maxWords ?? 4 }),
    [result, settings?.maxWords]
  );

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

  const previewWords = useMemo(() => {
    if (overlayWords.length) return overlayWords;
    if (currentTime < 0.25 && chunks.length) {
      return chunks[0].words.map((w, i) => ({ ...w, active: i === 0 }));
    }
    return [];
  }, [overlayWords, chunks, currentTime]);

  // Undo/Redo wired to history hook
  const handleUndo = useCallback(() => {
    const prev = historyUndo();
    if (!prev) { toast.info("Nothing to undo"); return; }
    setResult(docToResult(prev));
    handleSaveCaptionDoc(prev);
    toast.success("Undone ↩", { duration: 1200 });
  }, [historyUndo, handleSaveCaptionDoc]);

  const handleRedo = useCallback(() => {
    const next = historyRedo();
    if (!next) { toast.info("Nothing to redo"); return; }
    setResult(docToResult(next));
    handleSaveCaptionDoc(next);
    toast.success("Redone ↪", { duration: 1200 });
  }, [historyRedo, handleSaveCaptionDoc]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    videoRef,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onToggleSearch: () => setShowSearch((v) => !v),
    onTranscribe: () => { if (!transcribing && project?.media_id) handleTranscribe(); },
    onEscape: () => setShowSearch(false),
    enabled: !pageLoading,
  });

  // Search & Replace: batch replace all matches
  const handleReplaceAll = useCallback((findText, replaceText, caseSensitive) => {
    if (!captionDoc) return;
    pushHistory(captionDoc);
    const lFind = caseSensitive ? findText : findText.toLowerCase();
    let count = 0;
    const words = captionDoc.words.map((w) => {
      const lWord = caseSensitive ? w.text : w.text.toLowerCase();
      if (lWord === lFind.trim()) { count++; return { ...w, text: replaceText }; }
      return w;
    });
    if (count === 0) { toast.info("No matches found"); return; }
    const segments = captionDoc.segments.map((seg) => ({
      ...seg,
      text: words.filter((w) => seg.word_ids.includes(w.id)).map((w) => w.text).join(" "),
    }));
    const updated = { ...captionDoc, words, segments };
    setCaptionDoc(updated);
    setResult(docToResult(updated));
    handleSaveCaptionDoc(updated);
    toast.success(`Replaced ${count} instance${count !== 1 ? "s" : ""} of "${findText}"`); 
  }, [captionDoc, pushHistory, handleSaveCaptionDoc]);

  const handleReplaceOne = useCallback((wordId, replaceText) => {
    if (!captionDoc) return;
    pushHistory(captionDoc);
    const words = captionDoc.words.map((w) => w.id === wordId ? { ...w, text: replaceText } : w);
    const segments = captionDoc.segments.map((seg) => ({
      ...seg,
      text: words.filter((w) => seg.word_ids.includes(w.id)).map((w) => w.text).join(" "),
    }));
    const updated = { ...captionDoc, words, segments };
    setCaptionDoc(updated);
    setResult(docToResult(updated));
    handleSaveCaptionDoc(updated);
    toast.success("Word replaced", { duration: 1200 });
  }, [captionDoc, pushHistory, handleSaveCaptionDoc]);

  const handleTranscribe = async () => {
    setTranscribing(true);
    resetHistory(null);
    setResult(null);
    try {
      const params = new URLSearchParams();
      if (denoise) params.append("denoise", "true");
      params.append("language", language);
      const { data } = await api.post(`/projects/${projectId}/transcribe?${params.toString()}`);
      if (!data.words?.length) {
        toast.error("No speech detected in this clip.");
      } else {
        resetHistory(data);
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

  const handleExport = useCallback(async (format) => {
    if (!result) return;
    const label = format.toUpperCase();
    const tid = toast.loading(`Preparing ${label} file…`);
    try {
      const resp = await api.get(`/projects/${projectId}/export?format=${format}`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      // Try to grab filename from Content-Disposition header
      const disposition = resp.headers["content-disposition"] || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      a.download = match ? match[1] : `captions.${format}`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${label} file downloaded!`, { id: tid });
    } catch (e) {
      toast.error(`Export failed: ${formatApiErrorDetail(e.response?.data?.detail) || "Unknown error"}`, { id: tid });
    }
  }, [result, projectId]);

  // ---- Video Burn-In Rendering State & Polling ----
  const [renderOpen, setRenderOpen] = useState(false);
  const [renderStatus, setRenderStatus] = useState("idle"); // idle | rendering | done | failed
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderUrl, setRenderUrl] = useState(null);
  const [renderError, setRenderError] = useState(null);
  const pollTimerRef = useRef(null);

  const handleStartRender = async () => {
    if (!result) return;
    setRenderOpen(true);
    setRenderStatus("rendering");
    setRenderProgress(10);
    setRenderUrl(null);
    setRenderError(null);

    try {
      const { data } = await api.post(`/projects/${projectId}/render`);
      const jobId = data.job_id;
      
      let currentProgress = 10;
      
      // Poll rendering status every 2.5 seconds
      pollTimerRef.current = setInterval(async () => {
        try {
          const resp = await api.get(`/projects/${projectId}/render/status/${jobId}`);
          const job = resp.data;
          
          if (job.status === "done") {
            clearInterval(pollTimerRef.current);
            setRenderStatus("done");
            setRenderProgress(100);
            setRenderUrl(job.download_url);
            toast.success("Video rendering complete! 🎉");
          } else if (job.status === "failed") {
            clearInterval(pollTimerRef.current);
            setRenderStatus("failed");
            setRenderError(job.error || "FFmpeg rendering failed");
            toast.error("Video rendering failed");
          } else {
            // Processing: simulate progressive increment
            currentProgress = Math.min(currentProgress + 8, 92);
            setRenderProgress(currentProgress);
          }
        } catch (err) {
          console.error("Error polling render status:", err);
        }
      }, 2500);

    } catch (e) {
      setRenderStatus("failed");
      setRenderError(formatApiErrorDetail(e.response?.data?.detail) || "Failed to start rendering job");
      toast.error("Failed to start render");
    }
  };

  // Clear timer on unmount
  useEffect(() => {
    return () => clearInterval(pollTimerRef.current);
  }, []);

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

      {/* Export toolbar — only visible when captions exist */}
      {result && (
        <div className="flex items-center justify-end gap-3 px-6 lg:px-8 py-2 bg-white border-b border-gray-100 flex-wrap">
          <span className="text-xs text-gray-400 mr-auto">Studio</span>

          {/* Undo / Redo */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              data-testid="undo-btn"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              data-testid="redo-btn"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <Redo2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowSearch((v) => !v)}
              title="Find & Replace (Ctrl+F)"
              data-testid="search-btn"
              className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                showSearch ? "bg-orange-50 text-[#FA5D29]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
          
          <button
            onClick={handleStartRender}
            data-testid="render-video-btn"
            className="inline-flex items-center gap-2 text-sm font-semibold bg-[#FA5D29] hover:bg-[#E04C1E] text-white px-4 py-1.5 rounded-lg transition-colors shadow-sm"
          >
            <Film className="h-3.5 w-3.5" />
            Download Video
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid="export-dropdown-btn"
                className="inline-flex items-center gap-2 text-sm font-medium border border-gray-200 hover:border-[#FA5D29] hover:text-[#FA5D29] text-gray-600 px-4 py-1.5 rounded-lg transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Download Subtitles
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs text-gray-400">Choose Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport("srt")} data-testid="export-srt">
                <FileText className="h-4 w-4 mr-2 text-blue-500" /> SRT
                <span className="ml-auto text-xs text-gray-400">Universal</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("vtt")} data-testid="export-vtt">
                <Captions className="h-4 w-4 mr-2 text-green-500" /> VTT
                <span className="ml-auto text-xs text-gray-400">Web</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("ass")} data-testid="export-ass">
                <FileCode2 className="h-4 w-4 mr-2 text-purple-500" /> ASS
                <span className="ml-auto text-xs text-gray-400">DaVinci</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("txt")} data-testid="export-txt">
                <AlignLeft className="h-4 w-4 mr-2 text-gray-400" /> TXT
                <span className="ml-auto text-xs text-gray-400">Plain</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

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

        {/* Right Panel — Tabs: Transcript | AI Content */}
        <div className="lg:col-span-5 flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative">
          {/* Tab Bar */}
          <div className="flex border-b border-gray-100 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("transcript")}
              data-testid="tab-transcript"
              className={`flex items-center gap-2 flex-1 justify-center py-3 text-sm font-medium transition-colors ${
                activeTab === "transcript"
                  ? "text-[#FA5D29] border-b-2 border-[#FA5D29] bg-orange-50/40"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <ScrollText className="h-4 w-4" />
              Transcript
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("content")}
              data-testid="tab-ai-content"
              className={`flex items-center gap-2 flex-1 justify-center py-3 text-sm font-medium transition-colors ${
                activeTab === "content"
                  ? "text-[#FA5D29] border-b-2 border-[#FA5D29] bg-orange-50/40"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              AI Content
              {project?.ai_content && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#FA5D29] ml-0.5" />
              )}
            </button>
          </div>

          {/* Search & Replace Panel overlay */}
          {showSearch && captionDoc && (
            <SearchReplacePanel
              words={captionDoc.words || []}
              onClose={() => setShowSearch(false)}
              onReplaceAll={handleReplaceAll}
              onReplaceOne={handleReplaceOne}
            />
          )}

          {/* Tab Content */}
          <div className="flex-1 min-h-0 overflow-hidden p-6">
            {activeTab === "transcript" ? (
              <CaptionEditor
                lines={lines}
                captionDoc={captionDoc}
                loading={transcribing}
                hasVideo={Boolean(project?.media_id)}
                onTranscribe={handleTranscribe}
                activeLineIndex={activeLineIndex}
                activeWord={activeWord}
                onSeek={handleSeek}
                saveStatus={saveStatus}
                onWordUpdate={handleWordUpdate}
                onWordDelete={handleWordDelete}
                onSegmentSplit={handleSegmentSplit}
                onSegmentMerge={handleSegmentMerge}
                denoise={denoise}
                onDenoiseChange={handleDenoiseChange}
                language={language}
                onLanguageChange={handleLanguageChange}
              />
            ) : (
              <ContentPanel
                projectId={projectId}
                hasCaptions={Boolean(result?.words?.length)}
                initialContent={project?.ai_content || null}
              />
            )}
          </div>
        </div>
      </main>

      {/* Dynamic Video Render Progress Dialog */}
      <Dialog open={renderOpen} onOpenChange={(open) => {
        if (!open && renderStatus === "rendering") {
          toast.info("Rendering continues in background.");
        }
        if (!open) {
          clearInterval(pollTimerRef.current);
        }
        setRenderOpen(open);
      }}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl shadow-xl border border-gray-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Film className="h-5 w-5 text-[#FA5D29]" />
              Export Captioned Video
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              We are baking your selected dynamic template styling directly into the video stream.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 flex flex-col items-center justify-center gap-4 text-center">
            {renderStatus === "rendering" && (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-[#FA5D29]" />
                <div className="w-full space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Rendering captions ({renderProgress}%)</p>
                  <Progress value={renderProgress} className="h-2 w-full bg-gray-100 [&>div]:bg-[#FA5D29]" />
                </div>
                <p className="text-xs text-gray-400">This takes 10-30 seconds depending on video length.</p>
              </>
            )}

            {renderStatus === "done" && (
              <>
                <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Your video is ready! 🎉</p>
                  <p className="text-xs text-gray-400 mt-0.5">Captions baked in with perfect styling.</p>
                </div>
                <a
                  href={`${API}${renderUrl}`}
                  download
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-[#FA5D29] hover:bg-[#E04C1E] text-white font-semibold py-2.5 rounded-xl shadow-sm transition-colors text-sm"
                >
                  <Download className="h-4 w-4" />
                  Download cap_video.mp4
                </a>
              </>
            )}

            {renderStatus === "failed" && (
              <>
                <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Rendering Failed</p>
                  <p className="text-xs text-red-500 mt-1 max-w-xs">{renderError}</p>
                </div>
                <button
                  onClick={handleStartRender}
                  className="w-full mt-2 bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 rounded-xl text-sm transition-colors"
                >
                  Try Again
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
