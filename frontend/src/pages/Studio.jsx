import { useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { VideoUploader } from "@/components/VideoUploader";
import { VideoStage } from "@/components/VideoStage";
import { CaptionEditor } from "@/components/CaptionEditor";
import { SAMPLE_RESULT, SAMPLE_VIDEO_URL } from "@/lib/mockData";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Group flat words into caption lines using segment boundaries.
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
  const videoRef = useRef(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const lines = useMemo(() => buildLines(result), [result]);

  const activeWord = useMemo(() => {
    if (!result?.words) return null;
    return (
      result.words.find((w) => currentTime >= w.start && currentTime < w.end) || null
    );
  }, [result, currentTime]);

  const activeLineIndex = useMemo(() => {
    if (!lines.length) return -1;
    const idx = lines.findIndex((l) => currentTime >= l.start && currentTime < l.end);
    return idx;
  }, [lines, currentTime]);

  const overlayWords = useMemo(() => {
    if (activeLineIndex < 0) return [];
    return lines[activeLineIndex].words.map((w) => ({
      ...w,
      active: w === activeWord,
    }));
  }, [lines, activeLineIndex, activeWord]);

  const handleFile = (f) => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFile(f);
    setResult(null);
    setCurrentTime(0);
    setVideoUrl(URL.createObjectURL(f));
  };

  const handleSample = () => {
    setFile(null);
    setVideoUrl(SAMPLE_VIDEO_URL);
    setResult(SAMPLE_RESULT);
    setCurrentTime(0);
    toast.success("Demo loaded — press play to see live semantic captions");
  };

  const handleChangeVideo = () => {
    if (videoUrl && file) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setFile(null);
    setResult(null);
    setCurrentTime(0);
  };

  const handleTranscribe = async () => {
    if (!file) {
      toast.info("Upload a video first, or load the demo to explore.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await axios.post(`${API}/transcribe`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!data.words?.length) {
        toast.error("No speech detected in this clip.");
      } else {
        setResult(data);
        toast.success("Captions generated with semantic highlighting!");
      }
    } catch (e) {
      const detail = e.response?.data?.detail || "Transcription failed. Try a shorter clip.";
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleSeek = (t) => {
    if (videoRef.current) {
      videoRef.current.currentTime = t;
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50 overflow-hidden">
      <Header />
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 md:p-6 lg:p-8 flex-1 min-h-0">
        <section className="lg:col-span-7 flex flex-col h-full bg-black rounded-2xl overflow-hidden relative shadow-lg group min-h-[320px]">
          {videoUrl ? (
            <VideoStage
              videoUrl={videoUrl}
              videoRef={videoRef}
              overlayWords={overlayWords}
              onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
              onChangeVideo={handleChangeVideo}
            />
          ) : (
            <VideoUploader onFile={handleFile} onSample={handleSample} />
          )}
        </section>

        <CaptionEditor
          lines={lines}
          loading={loading}
          hasVideo={Boolean(file)}
          onTranscribe={handleTranscribe}
          activeLineIndex={activeLineIndex}
          activeWord={activeWord}
          onSeek={handleSeek}
        />
      </main>
    </div>
  );
}
