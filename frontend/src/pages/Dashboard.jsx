import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Film, Trash2, Loader2, Clock, Type, Sparkles,
  Search, SortDesc, Pencil, CheckCircle2, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppHeader } from "@/components/AppHeader";
import { VideoUploader } from "@/components/VideoUploader";
import { api, formatApiErrorDetail } from "@/lib/api";

const STATUS_STYLES = {
  draft:        "bg-gray-100 text-gray-600",
  transcribing: "bg-orange-100 text-orange-700",
  denoising:    "bg-blue-100 text-blue-700",
  ready:        "bg-green-100 text-green-700",
  failed:       "bg-red-100 text-red-700",
};

const SORT_OPTIONS = [
  { label: "Last Updated",  key: "updated_at", desc: true },
  { label: "Newest First",  key: "created_at", desc: true },
  { label: "Oldest First",  key: "created_at", desc: false },
  { label: "Alphabetical",  key: "title",      desc: false },
];

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
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration || 0); };
    v.onerror = () => resolve(0);
    v.src = URL.createObjectURL(file);
  });

/** Capture a video thumbnail at t=1s and store in localStorage */
function captureThumbnail(file, projectId) {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    const canvas = document.createElement("canvas");
    v.preload = "metadata";
    v.muted = true;
    v.src = URL.createObjectURL(file);
    v.onloadeddata = () => {
      v.currentTime = Math.min(1, v.duration * 0.1);
    };
    v.onseeked = () => {
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(v, 0, 0, 320, 180);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      localStorage.setItem(`captioniq:thumb:${projectId}`, dataUrl);
      URL.revokeObjectURL(v.src);
      resolve(dataUrl);
    };
    v.onerror = () => { URL.revokeObjectURL(v.src); resolve(null); };
  });
}

/** Inline project title editor */
function InlineRename({ projectId, title, onDone }) {
  const [value, setValue] = useState(title);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === title) { onDone(title); return; }
    try {
      await api.patch(`/projects/${projectId}/title`, { title: trimmed });
      onDone(trimmed);
      toast.success("Project renamed");
    } catch {
      toast.error("Rename failed");
      onDone(title);
    }
  };

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") onDone(title);
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
      className="w-full text-sm font-semibold text-gray-900 bg-white border border-[#FA5D29] rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-orange-200"
    />
  );
}

/** Project card */
function ProjectCard({ project, onDelete, onRename, onClick }) {
  const [renaming, setRenaming] = useState(false);
  const thumb = localStorage.getItem(`captioniq:thumb:${project.project_id}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      onClick={onClick}
      data-testid={`project-card-${project.project_id}`}
      className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer overflow-hidden"
    >
      {/* Thumbnail area */}
      <div className="h-36 bg-gray-900 flex items-center justify-center relative overflow-hidden">
        {thumb ? (
          <img src={thumb} alt="" className="w-full h-full object-cover opacity-90" />
        ) : (
          <Film className="h-8 w-8 text-gray-600" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent" />

        {/* Status badge */}
        <span
          className={`absolute top-3 left-3 text-xs font-semibold px-2 py-1 rounded-lg capitalize ${STATUS_STYLES[project.status] || STATUS_STYLES.draft}`}
        >
          {project.status}
        </span>

        {/* Action buttons — visible on hover */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); setRenaming(true); }}
            data-testid={`rename-project-${project.project_id}`}
            className="h-7 w-7 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/40 text-white flex items-center justify-center transition-colors"
            title="Rename"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(project.project_id); }}
            data-testid={`delete-project-${project.project_id}`}
            className="h-7 w-7 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-red-500/80 text-white flex items-center justify-center transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Duration badge */}
        {project.duration > 0 && (
          <span className="absolute bottom-2.5 right-3 text-xs font-medium text-white/80 bg-black/40 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
            {fmtDuration(project.duration)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {renaming ? (
          <InlineRename
            projectId={project.project_id}
            title={project.title}
            onDone={(newTitle) => { setRenaming(false); onRename(project.project_id, newTitle); }}
          />
        ) : (
          <h3 className="font-semibold text-gray-900 truncate text-sm" title={project.title}>
            {project.title}
          </h3>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
          <span className="inline-flex items-center gap-1">
            <Type className="h-3 w-3" /> {project.word_count} words
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {fmtDuration(project.duration)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(SORT_OPTIONS[0]);

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

  useEffect(() => { load(); }, [load]);

  const handleFile = async (file) => {
    setCreating(true);
    try {
      const duration = await getDuration(file);
      const { data: proj } = await api.post("/projects", { title: file.name });
      const form = new FormData();
      form.append("file", file);
      form.append("duration", duration);
      await api.post(`/projects/${proj.project_id}/media`, form);
      // Capture thumbnail in background
      captureThumbnail(file, proj.project_id).catch(() => {});
      setDialogOpen(false);
      navigate(`/studio/${proj.project_id}`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Upload failed");
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/projects/${id}`);
      setProjects((p) => p.filter((x) => x.project_id !== id));
      localStorage.removeItem(`captioniq:thumb:${id}`);
      toast.success("Project deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleRename = (id, newTitle) => {
    setProjects((p) => p.map((proj) => proj.project_id === id ? { ...proj, title: newTitle } : proj));
  };

  // Filter & sort
  const filtered = projects
    .filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortKey.key] || "";
      const bv = b[sortKey.key] || "";
      if (av < bv) return sortKey.desc ? 1 : -1;
      if (av > bv) return sortKey.desc ? -1 : 1;
      return 0;
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-10">
        {/* Header row */}
        <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
          <div>
            <h1
              className="text-3xl font-bold tracking-tight text-gray-900"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Your Projects
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {projects.length > 0
                ? `${projects.length} project${projects.length !== 1 ? "s" : ""} — click to open in Studio`
                : "Upload a clip and let CaptionIQ do the rest."}
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button
                data-testid="new-project-btn"
                className="inline-flex items-center gap-2 bg-[#FA5D29] hover:bg-[#E04C1E] text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" />
                New Project
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: "Outfit, sans-serif" }}>New caption project</DialogTitle>
                <DialogDescription>
                  Upload a video or audio clip (up to 25MB). We'll transcribe it and highlight names, places and actions.
                </DialogDescription>
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

        {/* Search & Sort row */}
        {projects.length > 0 && (
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                data-testid="dashboard-search"
                className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[#FA5D29] transition-colors"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="dashboard-sort-btn"
                  className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 hover:border-gray-300 bg-white px-3 py-2.5 rounded-xl transition-colors"
                >
                  <SortDesc className="h-4 w-4" />
                  {sortKey.label}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {SORT_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.label}
                    onClick={() => setSortKey(opt)}
                    className={sortKey.label === opt.label ? "font-semibold text-[#FA5D29]" : ""}
                  >
                    {sortKey.label === opt.label && <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-[#FA5D29]" />}
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Content area */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-[#FA5D29]" />
            </div>
          ) : projects.length === 0 ? (
            /* Enhanced empty state */
            <div className="border-2 border-dashed border-gray-200 rounded-2xl py-20 flex flex-col items-center text-center" data-testid="empty-projects">
              <div className="h-16 w-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-5 shadow-sm">
                <Sparkles className="h-8 w-8 text-[#FA5D29]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
                No projects yet
              </h3>
              <p className="text-sm text-gray-500 max-w-xs mb-2">
                Create your first project to upload a video and generate semantic captions.
              </p>
              <div className="flex items-center gap-6 my-6 text-xs text-gray-400">
                {["Upload Video", "→ AI Transcription", "→ Download"].map((step) => (
                  <span key={step} className="font-medium">{step}</span>
                ))}
              </div>
              <button
                onClick={() => setDialogOpen(true)}
                className="inline-flex items-center gap-2 bg-[#FA5D29] hover:bg-[#E04C1E] text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors shadow-sm"
                data-testid="empty-new-project-btn"
              >
                <Plus className="h-4 w-4" />
                New Project
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-center">
              <Search className="h-8 w-8 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No results for "{search}"</p>
              <button onClick={() => setSearch("")} className="text-sm text-[#FA5D29] mt-2 hover:underline">Clear search</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="projects-grid">
              <AnimatePresence>
                {filtered.map((p) => (
                  <ProjectCard
                    key={p.project_id}
                    project={p}
                    onDelete={remove}
                    onRename={handleRename}
                    onClick={() => navigate(`/studio/${p.project_id}`)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
