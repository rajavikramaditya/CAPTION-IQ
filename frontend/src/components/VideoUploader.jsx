import { useRef } from "react";
import { UploadCloud, Film, Play } from "lucide-react";

export const VideoUploader = ({ onFile, onSample }) => {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const files = e.target.files;
    if (files && files.length) {
      if (files.length === 1) onFile(files[0]);
      else onFile(files);
    }
  };

  return (
    <div
      data-testid="video-uploader"
      onClick={() => inputRef.current?.click()}
      className="w-full h-full border-2 border-dashed border-gray-700 hover:border-[#FA5D29] bg-gray-900 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors text-white p-8 text-center"
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="video/*,audio/*"
        className="hidden"
        data-testid="video-file-input"
        onChange={handleChange}
      />
      <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center mb-5">
        <UploadCloud className="h-8 w-8 text-[#FA5D29]" />
      </div>
      <h3
        className="text-xl font-semibold tracking-tight"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        Drop your video here
      </h3>
      <p className="text-sm text-gray-400 mt-2 max-w-xs">
        MP4, WebM or audio up to 25MB. We&apos;ll auto-transcribe and highlight
        names, places and actions.
      </p>
      <div className="flex items-center gap-3 mt-6">
        <span className="inline-flex items-center gap-2 bg-[#FA5D29] hover:bg-[#E04C1E] transition-colors text-white text-sm font-medium px-5 py-2.5 rounded-xl">
          <Film className="h-4 w-4" />
          Choose file
        </span>
        {onSample && (
          <button
            type="button"
            data-testid="load-sample-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSample();
            }}
            className="inline-flex items-center gap-2 border border-white/20 hover:bg-white/10 transition-colors text-white text-sm font-medium px-5 py-2.5 rounded-xl"
          >
            <Play className="h-4 w-4" />
            Try demo
          </button>
        )}
      </div>
    </div>
  );
};
