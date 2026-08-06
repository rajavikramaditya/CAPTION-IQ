import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Film, Trash2, Loader2, Clock, Type, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { AppHeader } from "@/components/AppHeader";
import { VideoUploader } from "@/components/VideoUploader";
import { api, formatApiErrorDetail } from "@/lib/api";

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600",
  transcribing: "bg-orange-100 text-orange-700",
  ready: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

function fmtDuration(s) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const getDuration = (file) =>
  new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src);
      resolve(v.duration || 0);
    };
    v.onerror = () => resolve(0);
    v.src = URL.createObjectURL(file);
  });

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/projects");
      setProjects(data);
    } catch {
      toast.error("Could not load your projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFile = async (file) => {
    setCreating(true);
    try {
      const duration = await getDuration(file);
      const { data: proj } = await api.post("/projects", { title: file.name });
      const form = new FormData();
      form.append("file", file);
      form.append("duration", duration);
      await api.post(`/projects/${proj.project_id}/media`, form);
      setDialogOpen(false);
      navigate(`/studio/${proj.project_id}`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Upload failed");
    } finally {
      setCreating(false);
    }
  };

  const remove = async (e, id) => {
    e.stopPropagation();
    try {
      await api.delete(`/projects/${id}`);
      setProjects((p) => p.filter((x) => x.project_id !== id));
      toast.success("Project deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-10">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              Your Projects
            </h1>
            <p className="text-sm text-gray-500 mt-1">Upload a clip and let CaptionIQ do the rest.</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button
                data-testid="new-project-btn"
                className="inline-flex items-center gap-2 bg-[#FA5D29] hover:bg-[#E04C1E] text-white text-sm font-medium px-5 py-3 rounded-xl shadow-sm transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Project
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: "Outfit, sans-serif" }}>New caption project</DialogTitle>
              </DialogHeader>
              <div className="h-72 mt-2 relative">
                {creating && (
                  <div className="absolute inset-0 z-10 bg-gray-900/80 rounded-2xl flex flex-col items-center justify-center text-white gap-3" data-testid="upload-progress">
                    <Loader2 className="h-6 w-6 animate-spin text-[#FA5D29]" />
                    <p className="text-sm">Uploading your clip…</p>
                  </div>
                )}
                <VideoUploader onFile={handleFile} />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-10">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-[#FA5D29]" />
            </div>
          ) : projects.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl py-20 flex flex-col items-center text-center" data-testid="empty-projects">
              <div className="h-14 w-14 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
                <Sparkles className="h-7 w-7 text-[#FA5D29]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                No projects yet
              </h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                Create your first project to upload a video and generate semantic captions.
              </p>
              <button
                onClick={() => setDialogOpen(true)}
                className="mt-6 inline-flex items-center gap-2 bg-[#FA5D29] hover:bg-[#E04C1E] text-white text-sm font-medium px-5 py-3 rounded-xl transition-colors"
                data-testid="empty-new-project-btn"
              >
                <Plus className="h-4 w-4" />
                New Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="projects-grid">
              {projects.map((p, i) => (
                <motion.div
                  key={p.project_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/studio/${p.project_id}`)}
                  data-testid={`project-card-${p.project_id}`}
                  className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="h-32 bg-gray-900 flex items-center justify-center relative">
                    <Film className="h-8 w-8 text-gray-600" />
                    <span className={`absolute top-3 left-3 text-xs font-medium px-2 py-1 rounded-md ${STATUS_STYLES[p.status] || STATUS_STYLES.draft}`}>
                      {p.status}
                    </span>
                    <button
                      onClick={(e) => remove(e, p.project_id)}
                      data-testid={`delete-project-${p.project_id}`}
                      className="absolute top-3 right-3 h-8 w-8 rounded-lg bg-white/10 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 truncate" title={p.title}>{p.title}</h3>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1"><Type className="h-3.5 w-3.5" /> {p.word_count} words</span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {fmtDuration(p.duration)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
