import { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Check, X } from "lucide-react";

export const OnboardingTour = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem("captioniq:has_seen_tour");
    if (!hasSeen) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const STEPS = [
    {
      title: "Welcome to CaptionIQ Studio! 🚀",
      desc: "CaptionIQ automatically highlights persons 🟡, actions 🟢, places 🔵, numbers 🟣, times 🌐, and emotions 💖 in your transcript.",
      target: "Video Stage & Safe Area Guides",
    },
    {
      title: "Interactive Transcript Editor 📝",
      desc: "Double-click any word to edit text, timing, or category tag. Click 'Remove Fillers' to auto-delete um/uh/matlab in 1 click!",
      target: "Transcript Panel",
    },
    {
      title: "1-Click Creator Templates & Magic 🎨",
      desc: "Pick from 16 trending templates or customize active word colors, box backgrounds, stroke width, and aspect ratios!",
      target: "Template Bar",
    },
  ];

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem("captioniq:has_seen_tour", "true");
      setVisible(false);
      onComplete?.();
    }
  };

  const handleSkip = () => {
    localStorage.setItem("captioniq:has_seen_tour", "true");
    setVisible(false);
    onComplete?.();
  };

  const curr = STEPS[step];

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-gray-900 text-white rounded-2xl p-5 shadow-2xl border border-gray-700 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-[#FA5D29] flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
        <button
          type="button"
          onClick={handleSkip}
          className="text-gray-400 hover:text-white p-1 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <h3 className="text-base font-bold text-white mb-1">{curr.title}</h3>
      <p className="text-xs text-gray-300 leading-relaxed mb-4">{curr.desc}</p>

      <div className="flex items-center justify-between pt-2 border-t border-gray-800">
        <button
          type="button"
          onClick={handleSkip}
          className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          Skip tour
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center gap-1.5 bg-[#FA5D29] hover:bg-[#E04C1E] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm"
        >
          {step === STEPS.length - 1 ? (
            <>
              Got it! <Check className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Next <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
