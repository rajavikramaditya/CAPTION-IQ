import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Loader2, Copy, Check, Hash, Youtube, Instagram, Linkedin,
  Target, Zap, BookOpen, Search, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "@/lib/api";

/** Copy to clipboard with toast feedback */
function useCopy() {
  const [copied, setCopied] = useState(null);
  const copy = (key, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied((k) => (k === key ? null : k)), 1800);
    });
  };
  return { copied, copy };
}

function CopyBtn({ id, text, onCopy, isCopied }) {
  return (
    <button
      type="button"
      onClick={() => onCopy(id, text)}
      title="Copy"
      className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-[#FA5D29] hover:bg-orange-50 transition-colors"
    >
      {isCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function Section({ icon: Icon, title, color, children }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 overflow-hidden">
      <div className={`flex items-center gap-2 px-3 py-2 border-b border-gray-100 ${color}`}>
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
      </div>
      <div className="px-3 py-2.5">{children}</div>
    </div>
  );
}

function TextSection({ icon, title, color, id, text, onCopy, isCopied }) {
  return (
    <Section icon={icon} title={title} color={color}>
      <div className="flex items-start gap-2">
        <p className="flex-1 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{text}</p>
        <CopyBtn id={id} text={text} onCopy={onCopy} isCopied={isCopied} />
      </div>
    </Section>
  );
}

function TagsSection({ icon, title, color, items, prefix = "#", onCopy, copied }) {
  const full = items.map((t) => `${prefix}${t}`).join(" ");
  return (
    <Section icon={icon} title={title} color={color}>
      <div className="flex items-start gap-2">
        <div className="flex-1 flex flex-wrap gap-1.5">
          {items.map((tag, i) => (
            <span
              key={i}
              className="inline-block text-xs bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded-full"
            >
              {prefix}{tag}
            </span>
          ))}
        </div>
        <CopyBtn id="tags" text={full} onCopy={onCopy} isCopied={copied === "tags"} />
      </div>
    </Section>
  );
}

/**
 * ContentPanel — AI Content Intelligence tab in Studio.
 *
 * Shows a "Generate Content" button. On click, calls POST /projects/{id}/content
 * and displays all generated social media content.
 *
 * Props: projectId, hasCaptions, initialContent (from project document if already generated)
 */
export const ContentPanel = ({ projectId, hasCaptions, initialContent }) => {
  const [content, setContent] = useState(initialContent || null);
  const [loading, setLoading] = useState(false);
  const { copied, copy } = useCopy();

  const handleGenerate = async () => {
    if (!hasCaptions) {
      toast.error("Generate captions first, then AI content can be created.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/content`);
      setContent(data);
      toast.success("AI content generated! ✨");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Content generation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#FA5D29]" />
          <h2
            className="text-lg font-semibold tracking-tight text-gray-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            AI Content
          </h2>
        </div>
        {content && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            title="Re-generate"
            className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#FA5D29] hover:bg-orange-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {!content && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center py-8 gap-4">
            <div className="h-16 w-16 rounded-2xl bg-orange-50 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-[#FA5D29]" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                Caption Magic ✨
              </p>
              <p className="text-sm text-gray-500 mt-1 max-w-xs">
                Turn your transcript into a full content kit — YouTube title, Instagram caption, hooks, hashtags & more.
              </p>
            </div>
            <button
              type="button"
              data-testid="generate-content-btn"
              disabled={!hasCaptions || loading}
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 bg-[#FA5D29] hover:bg-[#E04C1E] disabled:opacity-50 text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-sm transition-all"
            >
              <Sparkles className="h-4 w-4" />
              Generate AI Content
            </button>
            {!hasCaptions && (
              <p className="text-xs text-gray-400">Generate captions first to unlock this.</p>
            )}
          </div>
        )}

        {loading && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-orange-100 animate-ping" />
              <div className="h-16 w-16 rounded-full bg-orange-50 flex items-center justify-center">
                <Loader2 className="h-7 w-7 text-[#FA5D29] animate-spin" />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">AI is working its magic…</p>
              <p className="text-xs text-gray-400 mt-1">Crafting your content kit</p>
            </div>
          </div>
        )}

        {content && !loading && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {/* Hook — most important, show first */}
              {content.hook && (
                <div className="rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 p-4">
                  <div className="flex items-start gap-2">
                    <div>
                      <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">
                        ⚡ Viral Hook
                      </p>
                      <p className="text-sm font-semibold text-gray-900 leading-snug">
                        "{content.hook}"
                      </p>
                    </div>
                    <CopyBtn id="hook" text={content.hook} onCopy={copy} isCopied={copied === "hook"} />
                  </div>
                </div>
              )}

              {/* YouTube Title */}
              {content.youtube_title && (
                <TextSection
                  icon={Youtube} title="YouTube Title" color="text-red-600 bg-red-50"
                  id="yt" text={content.youtube_title} onCopy={copy} isCopied={copied === "yt"}
                />
              )}

              {/* Summary */}
              {content.summary && (
                <TextSection
                  icon={BookOpen} title="Video Summary" color="text-gray-600 bg-gray-100"
                  id="summary" text={content.summary} onCopy={copy} isCopied={copied === "summary"}
                />
              )}

              {/* Instagram */}
              {content.instagram_caption && (
                <TextSection
                  icon={Instagram} title="Instagram Caption" color="text-pink-600 bg-pink-50"
                  id="ig" text={content.instagram_caption} onCopy={copy} isCopied={copied === "ig"}
                />
              )}

              {/* LinkedIn */}
              {content.linkedin_caption && (
                <TextSection
                  icon={Linkedin} title="LinkedIn Caption" color="text-blue-700 bg-blue-50"
                  id="li" text={content.linkedin_caption} onCopy={copy} isCopied={copied === "li"}
                />
              )}

              {/* Hashtags */}
              {content.hashtags?.length > 0 && (
                <TagsSection
                  icon={Hash} title="Hashtags" color="text-purple-600 bg-purple-50"
                  items={content.hashtags} prefix="#" onCopy={copy} copied={copied}
                />
              )}

              {/* SEO Keywords */}
              {content.seo_keywords?.length > 0 && (
                <TagsSection
                  icon={Search} title="SEO Keywords" color="text-green-700 bg-green-50"
                  items={content.seo_keywords} prefix="" onCopy={copy} copied={copied}
                />
              )}

              {/* CTA */}
              {content.cta && (
                <TextSection
                  icon={Target} title="Call to Action" color="text-orange-600 bg-orange-50"
                  id="cta" text={content.cta} onCopy={copy} isCopied={copied === "cta"}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Re-generate button at bottom when content exists */}
      {content && !loading && (
        <button
          type="button"
          onClick={handleGenerate}
          className="w-full mt-4 py-3 rounded-xl border border-dashed border-gray-200 text-sm font-medium text-gray-500 hover:border-[#FA5D29] hover:text-[#FA5D29] transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Re-generate content
        </button>
      )}
    </div>
  );
};
