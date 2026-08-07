import { useState } from "react";
import { Upload, Font, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "@/lib/api";

export function FontUploader({ onFontUploaded }) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["ttf", "otf", "woff", "woff2"].includes(ext)) {
      toast.error("Please upload a .ttf, .otf, .woff or .woff2 font file");
      return;
    }

    setUploading(true);
    const form = new FormData();
    form.append("file", file);

    try {
      const { data } = await api.post("/fonts", form);
      toast.success(`Font "${data.name}" uploaded successfully!`);
      onFontUploaded?.(data);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Font upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <label
      data-testid="font-upload-label"
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 hover:border-[#FA5D29] text-gray-600 hover:text-[#FA5D29] cursor-pointer bg-white transition-colors"
    >
      {uploading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FA5D29]" />
      ) : (
        <Upload className="h-3.5 w-3.5" />
      )}
      <span>{uploading ? "Uploading..." : "Custom Font"}</span>
      <input
        type="file"
        accept=".ttf,.otf,.woff,.woff2"
        onChange={(e) => handleFile(e.target.files?.[0])}
        className="hidden"
      />
    </label>
  );
}
